import type { Vector3Tuple } from '@react-three/rapier'
import gsap from 'gsap'
import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

import type { Answer, Question } from '@/model/content'
import { LevelPhase } from '@/model/game'
import { useGameStore } from '@/stores/GameProvider'
import { type LevelConfig, useConfigStore } from '@/stores/useConfigStore'

type DebugInfo = {
  gameTime: number
  phase: LevelPhase
  phaseTime: number
  nextPhase: LevelPhase | null
  questionIndex: number
  question: Question
}

// Cycle of phases for each question
const OBSTACLE_QUESTION_PHASE_CYCLE = [LevelPhase.REST, LevelPhase.OBSTACLES, LevelPhase.QUESTION] as const
const QUESTION_ONLY_PHASE_CYCLE = [LevelPhase.REST, LevelPhase.QUESTION] as const

const ANSWER_SLOW_MO_DURATION = 4.0 // Default duration for slow-mo effect when answer gate is approached

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
  // Config - passed in from config store when the level starts
  config: LevelConfig

  // Time control state
  gameTime: number
  timeMultiplier: number
  setTimeMultiplier: (value: number) => void
  slowMoTimeRemaining: number
  isSlowMo: boolean
  goSlowMo: () => void

  // Phase state
  phases: LevelPhase[]
  phaseIndex: number
  phase: LevelPhase
  phaseTime: number
  onOnboardingPhaseCompleted: () => void // Manually trigger transition from onboarding to next phase
  onQuestionPhaseCompleted: () => void // Manually trigger transition to next phase rather than time based because questions could need dynamic time to answer.

  // Player
  playerPosition: Vector3Tuple
  currentPlayerLane: number // 0-8 index for 3x3 grid
  updatePlayerPosition: ({ pos, lanes }: { pos: Vector3Tuple; lanes: [xIndex: number, yIndex: number] }) => void

  // Questions
  questions: Question[]
  question: Question
  questionIndex: number
  answersMapping: (Answer | null)[]

  // Obstacles
  obstacles: ObstacleSpawnData[]

  // Event system methods
  start: (config: LevelConfig) => void
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
  phase: LevelPhase.INTRO,
  phaseTime: 0,
  isSlowMo: false,
  timeMultiplier: 1,
  slowMoTimeRemaining: 0,
  playerPosition: [0, 0, 0],
  currentPlayerLane: 4, // Center lane in 3x3 grid
  questionIndex: 0,
  obstacles: [],
}

const createLevelStore = ({
  config,
  questions,
  onCompleted,
}: {
  config: LevelConfig
  questions: Question[]
  onCompleted: () => void
}) => {
  let speedTimeline: GSAPTimeline
  // Create values which can be animated using GSAP (synced with store values which can't be mutated directly)
  const timeTweenTarget = { value: 1 }
  const slowMoTimeRemainingTarget = { value: ANSWER_SLOW_MO_DURATION }

  return createStore<LevelState>()((set, get) => ({
    // Configurable parameters set on load with default values
    ...INITIAL_STATE,
    config,
    questions,
    question: questions[0],
    phases: [],
    answersMapping: generateAnswerMapping(questions[0].answers),

    start: (config: LevelConfig) => {
      const phases = generatePhasesFromQuestions({
        questions,
        showOnboarding: config.showOnboarding,
        withObstacles: config.phaseDurations.OBSTACLES > 0,
      })
      console.warn('[LevelProvider] Starting level with config:', { config, phases })
      set({
        ...INITIAL_STATE,
        config,
        phases,
        answersMapping: generateAnswerMapping(questions[0].answers),
      })
    },
    reset: () => {
      set({
        ...INITIAL_STATE,
        question: questions[0],
      })
    },
    onQuestionPhaseCompleted: () => {
      const state = get()
      const newPhaseIndex = state.phaseIndex + 1
      const newPhase = state.phases[newPhaseIndex]
      console.warn('[LevelProvider] Question phase completed, moving to next phase:', { newPhase })
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
    onOnboardingPhaseCompleted: () => {
      const state = get()
      const newPhaseIndex = state.phaseIndex + 1
      const newPhase = state.phases[newPhaseIndex]
      console.warn('[LevelProvider] Onboarding phase completed, moving to next phase:', { newPhase })

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

      if (phase === LevelPhase.FINISHED) return // No updates once in the finished phase (this is in the background of the level complete screen)

      const { phaseDurations } = state.config
      const shouldMoveToNextPhase = phaseTime >= phaseDurations[phase]

      // Handle phase transitions
      if (shouldMoveToNextPhase) {
        phaseIndex++
        phaseTime = 0
        phase = state.phases[phaseIndex]

        if (phase === LevelPhase.REST) {
          console.warn('[LevelProvider] Transitioning to REST phase')
        }
        if (phase === LevelPhase.QUESTION) {
          console.warn('[LevelProvider] Transitioning to new QUESTION phase')
        }
        if (phase === LevelPhase.OBSTACLES) {
          // Generate complete obstacle sequence for this phase
          const obstacleSequence = generateObstacleSequence({
            phaseStartTime: gameTime,
            speed: state.config.obstacleSpeed,
            phaseDurations: phaseDurations,
            obstacleSpawnInterval: state.config.obstacleSpawnInterval,
          })
          console.warn('[LevelProvider] Transitioning to new OBSTACLES phase', { obstacleSequence })
          set({
            obstacles: obstacleSequence,
          })
        }

        if (phase === LevelPhase.FINISHED) {
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
        phase: state.phases[state.phaseIndex] || LevelPhase.OUTRO,
        nextPhase: state.phases?.[state.phaseIndex + 1] ?? null,
        questionIndex: state.questionIndex,
        question: state.question,
      }
    },
    setTimeMultiplier: (timeMultiplier: number) => set({ timeMultiplier }),

    goSlowMo: () => {
      if (get().isSlowMo) return
      set({ isSlowMo: true })
      gsap.set('#slow-mo-bar', { scaleX: 0, opacity: 1 })

      const slowMoDuration = get().config.slowMoDuration
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
          value: 0.04,
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
  const getLevelConfig = useConfigStore((s) => s.getLevelConfig)
  const onCompleted = useGameStore((s) => s.onCompleted)

  const store = useRef<LevelStore>(createLevelStore({ config: getLevelConfig(), questions, onCompleted }))

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

// Produces complete phase sequence based on number of questions and config options
const generatePhasesFromQuestions = ({
  showOnboarding,
  withObstacles,
  questions,
}: {
  showOnboarding: boolean
  withObstacles: boolean
  questions: Question[]
}): LevelPhase[] => {
  const phases = [LevelPhase.INTRO]

  if (showOnboarding) phases.push(LevelPhase.ONBOARDING)

  const questionPhases = questions.flatMap(() =>
    withObstacles ? OBSTACLE_QUESTION_PHASE_CYCLE : QUESTION_ONLY_PHASE_CYCLE,
  )

  phases.push(...questionPhases)
  phases.push(LevelPhase.OUTRO, LevelPhase.FINISHED)
  return phases
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
  speed,
  phaseDurations,
  obstacleSpawnInterval,
}: {
  phaseStartTime: number
  speed: number
  phaseDurations: Record<LevelPhase, number>
  obstacleSpawnInterval: number
}): ObstacleSpawnData[] => {
  const obstacles: ObstacleSpawnData[] = []
  const phaseDuration = phaseDurations[LevelPhase.OBSTACLES]
  const obstacleCount = Math.floor(phaseDuration / obstacleSpawnInterval)

  // Add a small delay to the first obstacle to ensure proper spacing
  const INITIAL_DELAY = 0.5 // Half second delay before first obstacle

  // Define lane groups for strategic coverage
  const middleLane = [4]
  const leftColumn = [0, 3, 6]
  const centerColumn = [1, 4, 7]
  const rightColumn = [2, 5, 8]
  const topRow = [0, 1, 2]
  const middleRow = [3, 4, 5]
  const bottomRow = [6, 7, 8]
  const outerLanes = [0, 1, 2, 3, 5, 6, 7, 8]

  for (let i = 0; i < obstacleCount; i++) {
    const spawnTime = phaseStartTime + INITIAL_DELAY + i * obstacleSpawnInterval
    const speedVariation = (Math.random() - 0.5) * 2 // Random between -1 and +1
    const obstacleSpeed = Math.max(1, speed + speedVariation)

    // Alternate between different strategic patterns
    let occupiedLanes: number[]
    let safeLanes: number[]

    const patternIndex = i % 6

    switch (patternIndex) {
      case 0: // Force player left - block center and right
        occupiedLanes = [...centerColumn, ...rightColumn]
        safeLanes = leftColumn
        break
      case 1: // Force player right - block left and center
        occupiedLanes = [...leftColumn, ...centerColumn]
        safeLanes = rightColumn
        break
      case 2: // Force player down - block top and middle
        occupiedLanes = [...topRow, ...middleRow]
        safeLanes = bottomRow
        break
      case 3: // Force player up - block middle and bottom
        occupiedLanes = [...middleRow, ...bottomRow]
        safeLanes = topRow
        break
      case 4: // Force player to middle - block outer lanes
        occupiedLanes = outerLanes
        safeLanes = middleLane
        break
      case 5: // Force player to outer lanes - block center lane
        occupiedLanes = middleLane
        safeLanes = outerLanes
        break
      default:
        occupiedLanes = [...centerColumn, ...rightColumn]
        safeLanes = leftColumn
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
