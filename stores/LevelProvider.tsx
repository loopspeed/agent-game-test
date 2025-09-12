import type { Vector3Tuple } from '@react-three/rapier'
import gsap from 'gsap'
import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

import type { Answer, Question } from '@/model/content'
import { useGameStore } from '@/stores/GameProvider'

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
  FINISHED = 'FINISHED',
}

const DEFAULT_PHASE_DURATIONS: Record<Phase, number> = {
  INTRO: 1, // For entry animation
  REST: 1, // Short rest before obstacles and after question
  OBSTACLES: 1,
  QUESTION: 10000, // Effectively infinite until question is answered and the gate is killed - when phase is advanced manually
  OUTRO: 5, // For showing "level complete"
  FINISHED: 10000, // For showing level complete screen
} as const

// Cycle of phases for each question
const QUESTIONS_PHASE_CYCLE = [Phase.REST, Phase.OBSTACLES, Phase.QUESTION] as const

const ANSWER_SLOW_MO_DURATION = 4.0 // Default duration for slow-mo effect when answer gate is approached
const OBSTACLE_SPAWN_INTERVAL = 1 // How often to spawn obstacles during obstacles phase
const DEFAULT_OBSTACLE_SPEED = 15 // Base speed for obstacles
const DEFAULT_ANSWER_SPEED = 7 // Base speed for answer gates

export enum ObstacleType {
  SPHERE = 'SPHERE',
}

export type ObstacleSpawnData = {
  id: string
  type: ObstacleType
  lanes: number[] // Which lanes to spawn obstacles in
  safeLanes: number[] // Which lanes are safe for the player to move into
  spawnTime: number // Game time when obstacle should spawn
  speed: number
}

type LevelState = {
  // Phase state
  phases: Phase[]
  phaseIndex: number
  phase: Phase
  phaseTime: number
  obstacleSpeed: number
  answerSpeed: number
  onQuestionPhaseCompleted: () => void // Manually trigger transition to next phase rather than time based because questions could need dynamic time to answer.

  // Player state
  playerPosition: Vector3Tuple
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
  questions: Question[]
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
  setObstacleSpeed: (speed: number) => void
  setAnswerSpeed: (speed: number) => void

  // Event system methods
  start: () => void
  reset: () => void
  update: (gameTime: number) => void
  getDebugInfo: () => DebugInfo
}

type LevelStore = StoreApi<LevelState>
const LevelContext = createContext<LevelStore>(undefined!)

const INITIAL_STATE: Pick<
  LevelState,
  | 'gameTime'
  | 'phaseIndex'
  | 'phase'
  | 'phaseTime'
  | 'isSlowMo'
  | 'playerPosition'
  | 'currentPlayerLane'
  | 'timeMultiplier'
  | 'slowMoTimeRemaining'
  | 'questionIndex'
  | 'obstacles'
> = {
  gameTime: 0,
  phaseIndex: 0,
  phase: Phase.INTRO,
  phaseTime: 0,
  isSlowMo: false,
  timeMultiplier: 1,
  slowMoTimeRemaining: 0,
  playerPosition: [0, 0, 0],
  currentPlayerLane: 4, // Center lane in 3x3 grid
  questionIndex: 0,
  obstacles: [],
}

const createLevelStore = ({ questions, onCompleted }: { questions: Question[]; onCompleted: () => void }) => {
  let speedTimeline: GSAPTimeline
  // Create values which can be animated using GSAP (synced with store values which can't be mutated directly)
  const timeTweenTarget = { value: 1 }
  const slowMoTimeRemainingTarget = { value: ANSWER_SLOW_MO_DURATION }

  return createStore<LevelState>()((set, get) => ({
    // Configurable parameters set on load with default values
    ...INITIAL_STATE,
    obstacleSpeed: DEFAULT_OBSTACLE_SPEED,
    answerSpeed: DEFAULT_ANSWER_SPEED,
    phaseDurations: DEFAULT_PHASE_DURATIONS,
    slowMoDuration: ANSWER_SLOW_MO_DURATION,
    obstacleSpawnInterval: OBSTACLE_SPAWN_INTERVAL,
    questions,
    question: questions[0],
    phases: generatePhasesFromQuestions(questions),
    answersMapping: generateAnswerMapping(questions[0].answers),

    start: () => {
      set(INITIAL_STATE)
    },
    reset: () => {
      set({
        ...INITIAL_STATE,
        question: questions[0],
        phases: generatePhasesFromQuestions(questions),
        answersMapping: generateAnswerMapping(questions[0].answers),
      })
    },

    onQuestionPhaseCompleted: () => {
      const state = get()
      const newPhaseIndex = state.phaseIndex + 1
      const newPhase = state.phases[newPhaseIndex]
      console.warn('[LevelProvider] Question phase completed, moving to next phase:', { newPhase, newPhaseIndex })
      const newQuestionIndex = state.questionIndex + 1

      const hasMoreQuestions = newQuestionIndex < questions.length
      if (hasMoreQuestions) {
        const nextQuestion = questions[newQuestionIndex]
        if (!nextQuestion) throw new Error('Expected next question to be defined')
        const answersMapping = generateAnswerMapping(nextQuestion.answers)
        set({
          questionIndex: newQuestionIndex,
          question: nextQuestion,
          answersMapping,
        })
      }

      set({
        phase: newPhase,
        phaseIndex: newPhaseIndex,
        phaseTime: 0,
      })
    },

    update: (gameTime: number) => {
      const state = get()
      let phaseIndex = state.phaseIndex
      let phase = state.phase
      let phaseTime = state.phaseTime + (gameTime - state.gameTime)

      if (phase === Phase.FINISHED) return // No updates once in the finished phase (this is in the background of the level complete screen)

      const shouldMoveToNextPhase = phaseTime >= state.phaseDurations[phase]

      // Handle phase transitions
      if (shouldMoveToNextPhase) {
        phaseIndex++
        phaseTime = 0
        phase = state.phases[phaseIndex]

        if (phase === Phase.REST) {
          console.warn('[LevelProvider] Transitioning to REST phase')
        }
        if (phase === Phase.QUESTION) {
          console.warn('[LevelProvider] Transitioning to new QUESTION phase')
        }
        if (phase === Phase.OBSTACLES) {
          // Generate complete obstacle sequence for this phase
          const obstacleSequence = generateObstacleSequence({
            phaseStartTime: gameTime,
            gameSpeed: state.obstacleSpeed,
            phaseDurations: state.phaseDurations,
            obstacleSpawnInterval: state.obstacleSpawnInterval,
          })
          console.warn('[LevelProvider] Transitioning to new OBSTACLES phase', { obstacleSequence })
          set({
            obstacles: obstacleSequence,
          })
        }

        if (phase === Phase.FINISHED) {
          console.warn('[LevelProvider] Reached FINISHED phase, triggering game over')
          onCompleted()
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
    setObstacleSpeed: (obstacleSpeed: number) => set({ obstacleSpeed }),
    setAnswerSpeed: (answerSpeed: number) => set({ answerSpeed }),

    goSlowMo: () => {
      if (get().isSlowMo) return
      set({ isSlowMo: true })
      gsap.set('#slow-mo-bar', { scaleX: 0, opacity: 1 })

      const slowMoDuration = get().slowMoDuration
      slowMoTimeRemainingTarget.value = slowMoDuration

      speedTimeline?.kill()
      speedTimeline = gsap
        .timeline({
          onComplete: () => {
            set({ isSlowMo: false, slowMoTimeRemaining: slowMoDuration })
            gsap.set('#slow-mo-bar', { scaleX: 0, opacity: 0 })
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
          scaleX: 1,
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
            duration: 0.5,
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
        currentPlayerLane,
      })
    },
  }))
}

type Props = PropsWithChildren<{ questions: Question[] }>

export const LevelProvider: FC<Props> = ({ children, questions }) => {
  const onCompleted = useGameStore((s) => s.onCompleted)
  const store = useRef<LevelStore>(createLevelStore({ questions, onCompleted }))
  return <LevelContext.Provider value={store.current}>{children}</LevelContext.Provider>
}

export function useLevelStore<T>(selector: (state: LevelState) => T): T {
  const store = useContext(LevelContext)
  if (!store) throw new Error('Missing LevelContext.Provider in the tree')
  return useStore(store, selector)
}

export function useLevelStoreAPI(): LevelStore {
  const levelStore = useContext(LevelContext)
  if (!levelStore) throw new Error('Missing LevelContext.Provider in the tree')
  return levelStore
}

// Produces complete phase sequence based on number of questions
const generatePhasesFromQuestions = (questions: Question[]): Phase[] => {
  const questionPhases = questions.flatMap(() => QUESTIONS_PHASE_CYCLE)
  return [Phase.INTRO, ...questionPhases, Phase.OUTRO, Phase.FINISHED]
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

  // Add a small delay to the first obstacle to ensure proper spacing
  const INITIAL_DELAY = 0.5 // Half second delay before first obstacle

  // Define lane groups for strategic coverage
  const leftLanes = [0, 3, 6] // Left column
  const centerLanes = [1, 4, 7] // Center column
  const rightLanes = [2, 5, 8] // Right column
  const topLanes = [0, 1, 2] // Top row
  const middleLanes = [3, 4, 5] // Middle row
  const bottomLanes = [6, 7, 8] // Bottom row
  const outerLanes = [0, 1, 2, 3, 5, 6, 7, 8]

  console.warn(`🎯 GENERATING NEW OBSTACLE SEQUENCE:`, {
    phaseStartTime: phaseStartTime.toFixed(2),
    phaseDuration,
    obstacleCount,
    interval: obstacleSpawnInterval,
    initialDelay: INITIAL_DELAY,
  })

  for (let i = 0; i < obstacleCount; i++) {
    const spawnTime = phaseStartTime + INITIAL_DELAY + i * obstacleSpawnInterval
    const speedVariation = (Math.random() - 0.5) * 2 // Random between -1 and +1
    const obstacleSpeed = Math.max(1, gameSpeed + speedVariation)

    // Alternate between different strategic patterns
    let occupiedLanes: number[]
    let safeLanes: number[]

    const patternIndex = i % 5 // Updated to include 5 patterns
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
      case 4: // Force player to center - block all outer lanes
        occupiedLanes = outerLanes
        safeLanes = [4] // Only center lane is safe
        break
      default:
        occupiedLanes = [...centerLanes, ...rightLanes]
        safeLanes = leftLanes
    }

    // Use phase index to ensure unique IDs across different phases
    const obstacle: ObstacleSpawnData = {
      id: `obstacle-phase-${Math.floor(phaseStartTime)}-${i}-${spawnTime.toFixed(2)}`,
      type: ObstacleType.SPHERE,
      lanes: occupiedLanes,
      safeLanes,
      spawnTime,
      speed: obstacleSpeed,
    }

    obstacles.push(obstacle)
  }

  console.warn(`🎯 COMPLETED OBSTACLE SEQUENCE GENERATION:`, {
    obstacleCount: obstacles.length,
    firstSpawnTime: obstacles[0]?.spawnTime.toFixed(2),
    lastSpawnTime: obstacles[obstacles.length - 1]?.spawnTime.toFixed(2),
    spawnTimes: obstacles.map((o) => o.spawnTime.toFixed(2)),
    obstacles: obstacles.map((o) => ({
      id: o.id,
      spawnTime: o.spawnTime.toFixed(2),
      occupiedLanes: o.lanes,
      safeLanes: o.safeLanes,
    })),
  })

  return obstacles
}
