import type { Vector3Tuple } from '@react-three/rapier'
import gsap from 'gsap'
import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

import type { Answer, Question } from '@/model/content'

type DebugInfo = {
  gameTime: number
  phase: Phase
  phaseTime: number
  nextPhase: Phase | null
  questionIndex: number
  question: Question
}

export enum Phase {
  INTRO = 'INTRO',
  REST = 'REST',
  OBSTACLES = 'OBSTACLES',
  QUESTION = 'QUESTION',
  OUTRO = 'OUTRO',
}

const DEFAULT_PHASE_DURATIONS: Record<Phase, number> = {
  INTRO: 1,
  REST: 3,
  OBSTACLES: 8,
  QUESTION: 10,
  OUTRO: 3,
} as const

const SLOW_MO_DURATION = 2.0

const OBSTACLE_SPAWN_INTERVAL = 1

const QUESTIONS_PHASE_CYCLE = [Phase.REST, Phase.OBSTACLES, Phase.QUESTION] as const

// Obstacle event types
export enum ObstacleType {
  SINGLE = 'SINGLE', // Forces player to move by blocking current lane
  CLUSTER = 'CLUSTER', // Blocks all lanes except one safe lane
}

export type ObstacleSpawnData = {
  id: string
  type: ObstacleType
  lanes: number[] // Which lanes to spawn obstacles in
  safeLanes: number[] // Which lanes are safe for the player to move into
  spawnTime: number // Game time when obstacle should spawn
  speed: number
}

type WorldState = {
  // Phase state
  phases: Phase[]
  phaseIndex: number
  phase: Phase
  phaseTime: number
  gameSpeed: number

  // Player state
  playerPosition: Vector3Tuple
  playerLanes: [xIndex: number, yIndex: number]
  currentPlayerLane: number // 0-8 index for 3x3 grid
  updatePlayerPosition: ({ pos, lanes }: { pos: Vector3Tuple; lanes: [xIndex: number, yIndex: number] }) => void

  // Time control state
  gameTime: number
  timeMultiplier: number
  setTimeMultiplier: (value: number) => void
  slowMoTimeRemaining: number
  isSlowMo: boolean
  goSlowMo: () => void

  // Question state
  question: Question
  questionIndex: number
  answersMapping: (Answer | null)[]

  // Obstacle state
  obstacles: ObstacleSpawnData[]

  // Configurable parameters
  phaseDurations: Record<Phase, number>
  slowMoDuration: number
  obstacleSpawnInterval: number
  setPhaseDurations: (durations: Record<Phase, number>) => void
  setSlowMoDuration: (duration: number) => void
  setObstacleSpawnInterval: (interval: number) => void

  // Event system methods
  start: () => void
  stop: () => void
  reset: () => void
  update: (gameTime: number) => void
  getDebugInfo: () => DebugInfo
}

type WorldStateStore = StoreApi<WorldState>
const WorldContext = createContext<WorldStateStore>(undefined!)

const INITIAL_STATE: Pick<
  WorldState,
  | 'gameTime'
  | 'phaseIndex'
  | 'phase'
  | 'phaseTime'
  | 'isSlowMo'
  | 'playerPosition'
  | 'playerLanes'
  | 'currentPlayerLane'
  | 'timeMultiplier'
  | 'slowMoTimeRemaining'
  | 'questionIndex'
  | 'gameSpeed'
  | 'obstacles'
  | 'phaseDurations'
  | 'slowMoDuration'
  | 'obstacleSpawnInterval'
> = {
  gameTime: 0,

  phaseIndex: 0,
  phase: Phase.INTRO,
  phaseTime: 0,

  isSlowMo: false,
  timeMultiplier: 1,
  slowMoTimeRemaining: 0,
  playerPosition: [0, 0, 0],
  playerLanes: [1, 1],
  currentPlayerLane: 4, // Center lane in 3x3 grid
  questionIndex: 0,
  gameSpeed: 12.0,
  obstacles: [],

  // Configurable parameters with default values
  phaseDurations: DEFAULT_PHASE_DURATIONS,
  slowMoDuration: SLOW_MO_DURATION,
  obstacleSpawnInterval: OBSTACLE_SPAWN_INTERVAL,
}

const createWorldStore = ({ questions }: { questions: Question[] }) => {
  let speedTimeline: GSAPTimeline
  // Create values which can be animated using GSAP (synced with store values which can't be mutated directly)
  const timeTweenTarget = { value: 1 }
  const slowMoTimeRemainingTarget = { value: SLOW_MO_DURATION }

  const mapQuestionsToPhases = (questions: Question[]): Phase[] => {
    const questionPhases = questions.flatMap(() => QUESTIONS_PHASE_CYCLE)
    return [Phase.INTRO, ...questionPhases, Phase.OUTRO]
  }

  const initialState = {
    ...INITIAL_STATE,
    question: questions[0],
    phases: mapQuestionsToPhases(questions),
    answersMapping: generateAnswerMapping(questions[0].answers),
  }

  console.warn('[World] Initialized with phases:', initialState.phases)

  return createStore<WorldState>()((set, get) => ({
    ...initialState,

    start: () => {
      console.warn('[World] Event system started')
      // const questionEvents = generateQuestionEvents(questions)
      set({
        ...initialState,
        // questionEvents,
      })
    },

    stop: () => {
      console.warn('[World] Event system stopped')
      set({ ...initialState })
    },

    reset: () => {
      console.warn('[World] Event system reset')
      set({
        ...initialState,
        question: questions[0],
        // questionEvents,
      })
    },

    update: (gameTime: number) => {
      const state = get()

      let phaseIndex = state.phaseIndex
      let phase = state.phase
      let phaseTime = state.phaseTime + (gameTime - state.gameTime)
      const shouldMoveToNextPhase = phaseTime >= state.phaseDurations[phase]

      // Handle phase transitions
      if (shouldMoveToNextPhase) {
        phaseIndex++

        const isCompleted = phaseIndex >= state.phases.length
        if (isCompleted) {
          console.warn('[World] Completed all phases')
          return
        }

        phaseTime = 0
        phase = state.phases[phaseIndex]

        // Handle transition to new question
        if (phase === Phase.QUESTION) {
          const newQuestionIndex = state.questionIndex + 1
          const nextQuestion = questions[newQuestionIndex]
          if (!nextQuestion) throw new Error('No more questions available')
          const answersMapping = generateAnswerMapping(nextQuestion.answers)
          set({
            gameTime,
            phase,
            phaseTime,
            phaseIndex,
            answersMapping,
            question: nextQuestion,
            questionIndex: newQuestionIndex,
          })
          return
        }

        // Handle entering obstacles phase
        if (phase === Phase.OBSTACLES) {
          // Generate complete obstacle sequence for this phase
          const obstacleSequence = generateObstacleSequence({
            phaseStartTime: gameTime,
            gameSpeed: state.gameSpeed,
            phaseDurations: state.phaseDurations,
            obstacleSpawnInterval: state.obstacleSpawnInterval,
          })
          set({
            gameTime,
            phase,
            phaseTime,
            phaseIndex,
            obstacles: obstacleSequence,
          })
          return
        }

        set({
          gameTime,
          phase,
          phaseTime,
          phaseIndex,
        })
        return
      }

      set({
        gameTime,
        phaseTime,
      })
    },

    getDebugInfo: (): DebugInfo => {
      const state = get()
      return {
        gameTime: state.gameTime,
        phaseTime: state.phaseTime,
        phase: state.phases[state.phaseIndex] || Phase.OUTRO,
        nextPhase: state.phases?.[state.phaseIndex + 1] ?? null,
        questionIndex: state.questionIndex,
        question: state.question,
      }
    },

    setTimeMultiplier: (timeMultiplier: number) => set({ timeMultiplier }),

    setPhaseDurations: (phaseDurations: Record<Phase, number>) => set({ phaseDurations }),
    setSlowMoDuration: (slowMoDuration: number) => set({ slowMoDuration }),
    setObstacleSpawnInterval: (obstacleSpawnInterval: number) => set({ obstacleSpawnInterval }),

    goSlowMo: () => {
      if (get().isSlowMo) return
      console.warn('🎵 SLOW-MO TRIGGERED')
      set({ isSlowMo: true })
      gsap.set('#slow-mo-bar', { scaleX: 1, opacity: 1 })

      const { slowMoDuration } = get()
      slowMoTimeRemainingTarget.value = slowMoDuration

      speedTimeline?.kill()
      speedTimeline = gsap
        .timeline({
          onComplete: () => {
            gsap.set('#slow-mo-bar', { scaleX: 1, opacity: 0 })
            set({ isSlowMo: false, slowMoTimeRemaining: slowMoDuration })
          },
        })
        // Slow time down as the answer gate approaches
        .to(timeTweenTarget, {
          duration: 0.5,
          ease: 'power2.out',
          value: 0.1,
          onUpdate: () => {
            set({ timeMultiplier: timeTweenTarget.value })
          },
        })
        .to('#slow-mo-bar', {
          scaleX: 0,
          duration: slowMoDuration,
          ease: 'none',
          onUpdate: () => {
            set({ slowMoTimeRemaining: slowMoTimeRemainingTarget.value })
          },
        })
        // Speed back up again
        .to(
          timeTweenTarget,
          {
            duration: 0.4,
            ease: 'power1.in',
            value: 1.0,
            onUpdate: () => {
              set({ timeMultiplier: timeTweenTarget.value })
            },
          },
          slowMoDuration + 0.6,
        )
    },

    updatePlayerPosition: ({ pos, lanes }) => {
      const currentPlayerLane = lanes[1] * 3 + lanes[0] // Convert to 0-8 index
      set({
        playerPosition: pos,
        playerLanes: lanes,
        currentPlayerLane,
      })
    },
  }))
}

export const WorldProvider: FC<PropsWithChildren<{ questions: Question[] }>> = ({ children, questions }) => {
  const worldStore = useRef<WorldStateStore>(createWorldStore({ questions }))
  return <WorldContext.Provider value={worldStore.current}>{children}</WorldContext.Provider>
}

export function useWorldStore<T>(selector: (state: WorldState) => T): T {
  const worldStore = useContext(WorldContext)
  if (!worldStore) throw new Error('Missing WorldContext.Provider in the tree')
  return useStore(worldStore, selector)
}

export function useWorldStoreAPI(): WorldStateStore {
  const worldStore = useContext(WorldContext)
  if (!worldStore) throw new Error('Missing WorldContext.Provider in the tree')
  return worldStore
}

// Generate random answer mapping for 3x3 grid
const generateAnswerMapping = (answers: Answer[]): (Answer | null)[] => {
  const mapping = new Array(9).fill(null)

  // Shuffle positions
  const availablePositions = Array.from({ length: 9 }, (_, i) => i)
  for (let i = availablePositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]]
  }

  // Place answers in random positions
  answers.forEach((answer, index) => {
    if (index < availablePositions.length) {
      mapping[availablePositions[index]] = answer
    }
  })

  return mapping
}

// Generate complete obstacle sequence for obstacles phase
const generateObstacleSequence = ({
  phaseStartTime,
  gameSpeed,
  phaseDurations,
  obstacleSpawnInterval,
}: {
  phaseStartTime: number
  gameSpeed: number
  phaseDurations: Record<Phase, number>
  obstacleSpawnInterval: number
}): ObstacleSpawnData[] => {
  const obstacles: ObstacleSpawnData[] = []
  const phaseDuration = phaseDurations[Phase.OBSTACLES]
  const obstacleCount = Math.floor(phaseDuration / obstacleSpawnInterval)

  // Define lane groups for strategic coverage
  const leftLanes = [0, 3, 6] // Left column
  const centerLanes = [1, 4, 7] // Center column
  const rightLanes = [2, 5, 8] // Right column
  const topLanes = [0, 1, 2] // Top row
  const middleLanes = [3, 4, 5] // Middle row
  const bottomLanes = [6, 7, 8] // Bottom row

  for (let i = 0; i < obstacleCount; i++) {
    const spawnTime = phaseStartTime + i * obstacleSpawnInterval
    const speedVariation = (Math.random() - 0.5) * 2 // Random between -1 and +1
    const obstacleSpeed = Math.max(1, gameSpeed + speedVariation)

    // Alternate between different strategic patterns
    let occupiedLanes: number[]
    let safeLanes: number[]

    const patternIndex = i % 4
    switch (patternIndex) {
      case 0: // Force player left - block center and right
        occupiedLanes = [...centerLanes, ...rightLanes]
        safeLanes = leftLanes
        break
      case 1: // Force player right - block left and center
        occupiedLanes = [...leftLanes, ...centerLanes]
        safeLanes = rightLanes
        break
      case 2: // Force player down - block top and middle
        occupiedLanes = [...topLanes, ...middleLanes]
        safeLanes = bottomLanes
        break
      case 3: // Force player up - block middle and bottom
        occupiedLanes = [...middleLanes, ...bottomLanes]
        safeLanes = topLanes
        break
      default:
        occupiedLanes = [...centerLanes, ...rightLanes]
        safeLanes = leftLanes
    }

    const obstacle: ObstacleSpawnData = {
      id: `obstacle-${i}-${spawnTime.toFixed(2)}`,
      type: ObstacleType.CLUSTER,
      lanes: occupiedLanes,
      safeLanes,
      spawnTime,
      speed: obstacleSpeed,
    }

    obstacles.push(obstacle)
  }

  console.warn(`🎯 GENERATED OBSTACLE SEQUENCE:`, {
    obstacleCount,
    phaseDuration,
    interval: obstacleSpawnInterval,
    obstacles: obstacles.map((o) => ({
      id: o.id,
      spawnTime: o.spawnTime.toFixed(2),
      occupiedLanes: o.lanes,
      safeLanes: o.safeLanes,
    })),
  })

  return obstacles
}
