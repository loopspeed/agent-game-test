import type { Vector3Tuple } from '@react-three/rapier'
import gsap from 'gsap'
import { createContext, type FC, type PropsWithChildren, useContext, useEffect, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

import type { Answer, Chapter, Course, Question } from '@/model/content'
import {
  AnswerGateUserData,
  AnswerHit,
  ChapterRun,
  LevelPhase,
  ObstacleAvoidedUserData,
  ObstacleUserData,
} from '@/model/game'
import { SoundFX } from '@/stores/SoundProvider'
import { DEFAULT_LEVEL_CONFIG, type LevelConfig } from '@/stores/useConfigStore'

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

// Level constants
export const GRID_SQUARE_SIZE_M = 1.6 // Meters
export const LANES_Y_OFFSET = -0.6 // Move them down to avoid question
export const LANES_X = [-1, 0, 1].map((x) => x * GRID_SQUARE_SIZE_M)
export const LANES_Y = [-1, 0, 1].map((y) => y * GRID_SQUARE_SIZE_M + LANES_Y_OFFSET)
export const CAMERA_FAR = 50
export const SPAWN_OBSTACLE_Z = -40 as const
export const KILL_OBSTACLE_Z = 9 as const

// Slow motion constants
export const SLOW_MO_RAMP_DURATION = 0.5 // Duration in seconds for slowing down to slow-mo speed
export const SLOW_MO_MULTIPLIER = 0.04 // Time multiplier during slow-mo
export const SLOW_MO_EXTREME_MULTIPLIER = 0.015 // Extreme slow-mo multiplier for very long answer durations
export const MAX_SLOW_MO_TRIGGER_DISTANCE = 5 // Maximum distance from player to trigger slow-mo to keep gates readable

// Points system constants
export const POINTS_OBSTACLE_HIT = -10 as const
export const POINTS_OBSTACLE_AVOIDED = 5 as const
export const POINTS_ANSWER_CORRECT = 20 as const
export const POINTS_ANSWER_INCORRECT = -5 as const

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

// Currently score events only track obstacle hits/avoids, not answers
export type ScoreEvent = {
  type: 'hit' | 'avoided'
  obstacleId: string
  points: number
  timestamp: number
}

type LevelState = {
  config: LevelConfig

  // Time control state
  gameStartTime: number
  totalTime: number
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
  onConfigCompleted: (config: LevelConfig) => void // Manually trigger transition from config to intro phase
  onOnboardingCompleted: () => void // Manually trigger transition from onboarding to next phase
  onQuestionCompleted: () => void // Manually trigger transition to next phase rather than time based because questions could need dynamic time to answer.
  onOutroCompleted: () => void

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

  // Scoring
  points: number
  scoreEvents: ScoreEvent[]
  streak: number
  maxStreak: number
  answersHit: AnswerHit[]

  // Game events
  onObstacleHit: (data: ObstacleUserData) => void
  onObstacleAvoided: (data: ObstacleAvoidedUserData) => void
  onAnswerHit: (data: AnswerGateUserData) => void

  // Event system methods
  // start: (config: LevelConfig) => void
  // reset: () => void
  update: (gameTime: number) => void
  getDebugInfo: () => DebugInfo
}

type LevelStore = StoreApi<LevelState>
const LevelContext = createContext<LevelStore>(undefined!)

const INITIAL_STATE: Pick<
  LevelState,
  | 'totalTime'
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
  | 'streak'
  | 'maxStreak'
  | 'points'
  | 'scoreEvents'
  | 'answersHit'
> = {
  totalTime: 0,
  phaseIndex: 0,
  phase: LevelPhase.CONFIG,
  phaseTime: 0,
  isSlowMo: false,
  timeMultiplier: 1,
  slowMoTimeRemaining: 0,
  playerPosition: [0, 0, 0],
  currentPlayerLane: 4, // Center lane in 3x3 grid
  questionIndex: 0,
  obstacles: [],
  streak: 0,
  maxStreak: 0,
  points: 0,
  scoreEvents: [],
  answersHit: [],
}

type CreateStoreParams = {
  course: Course
  chapter: Chapter
  onComplete: (run: ChapterRun) => void
  playSoundFX: (fx: SoundFX) => void
}

const createLevelStore = ({ course, chapter, onComplete, playSoundFX }: CreateStoreParams) => {
  let speedTimeline: GSAPTimeline
  // Create values which can be animated using GSAP (synced with store values which can't be mutated directly)
  const timeTweenTarget = { value: 1 }
  let answerTimeRemaining = { value: 4.0 }

  const questions = chapter.questions

  const goToNextPhase = (get: any, set: any) => {
    const state = get()
    const newPhaseIndex = state.phaseIndex + 1
    const newPhase = state.phases[newPhaseIndex]
    console.warn('[LevelProvider] moving to next phase:', { newPhase })
  }

  return createStore<LevelState>()((set, get) => ({
    // Configurable parameters set on load with default values
    ...INITIAL_STATE,
    gameStartTime: 0,
    config: DEFAULT_LEVEL_CONFIG,
    questions,
    question: questions[0],
    phases: [LevelPhase.CONFIG, LevelPhase.INTRO],
    answersMapping: generateAnswerMapping(questions[0].answers),

    onConfigCompleted: (config: LevelConfig) => {
      const phases = generatePhasesFromQuestions({
        questions,
        showOnboarding: config.showOnboarding,
        withObstacles: config.phaseDurations.OBSTACLES > 0,
      })
      answerTimeRemaining = { value: config.answerTimeDuration }
      console.warn('[LevelProvider] Starting level with config:', { config, phases })

      set({
        phases,
        config,
        gameStartTime: Date.now(),
        phase: phases[1],
        phaseIndex: 1,
        phaseTime: 0,
      })
    },
    onOnboardingCompleted: () => {
      goToNextPhase(get, set)
    },
    onQuestionCompleted: () => {
      const phaseIndex = get().phaseIndex
      const phases = get().phases
      const questionIndex = get().questionIndex

      const newPhaseIndex = phaseIndex + 1
      const newPhase = phases[newPhaseIndex]
      console.warn('[LevelProvider] Question phase completed, moving to next phase:', { newPhase })

      // Play level complete sound over outro - different based on result
      if (newPhase === LevelPhase.OUTRO) {
        const hasIncorrectAnswers = get().answersHit.some((hit) => !hit.isCorrect)
        const soundFX = hasIncorrectAnswers ? SoundFX.GAME_OVER : SoundFX.LEVEL_COMPLETE
        playSoundFX(soundFX)
      }

      const newQuestionIndex = questionIndex + 1

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

    onOutroCompleted: () => {
      console.warn('[LevelProvider] Outro phase completed. Ending level')
      const state = get()
      const completionTime = Date.now() - state.gameStartTime // This doesn't account for slow motion time so needs re-assessing.
      onComplete({
        id: crypto.randomUUID(),
        courseId: course.id,
        chapterId: chapter.id,
        timestamp: Date.now(),
        answers: state.answersHit,
        points: state.points,
        completionTime,
      })
    },
    update: (gameTime: number) => {
      const state = get()
      let phase = state.phase
      if (phase === LevelPhase.CONFIG) return // Don't advance time in config phase

      let phaseIndex = state.phaseIndex
      let phaseTime = state.phaseTime + (gameTime - state.totalTime)

      const { phaseDurations } = state.config
      const shouldMoveToNextPhase = phaseTime >= phaseDurations[phase]

      // Handle phase transitions
      if (shouldMoveToNextPhase) {
        const previousPhase = phase
        phaseIndex++
        phaseTime = 0
        phase = state.phases[phaseIndex]

        if (previousPhase === LevelPhase.INTRO) {
          playSoundFX(SoundFX.COUNTDOWN)
        }
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

        set({
          totalTime: gameTime,
          phase,
          phaseTime,
          phaseIndex,
        })
        return
      }

      set({
        totalTime: gameTime,
        phaseTime,
      })
    },
    getDebugInfo: (): DebugInfo => {
      const state = get()
      return {
        gameTime: state.totalTime,
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

      const { answerTimeDuration, answerSpeed } = get().config
      answerTimeRemaining.value = answerTimeDuration

      // Calculate if we need extreme slow-mo to keep gates readable
      const maxDistanceWithNormalSlowMo =
        answerSpeed * SLOW_MO_MULTIPLIER * answerTimeDuration + answerSpeed * SLOW_MO_RAMP_DURATION
      const needsExtremeSlowMo = maxDistanceWithNormalSlowMo > MAX_SLOW_MO_TRIGGER_DISTANCE

      console.warn('[LevelProvider] Slow-mo calculation:', {
        answerTimeDuration,
        answerSpeed,
        maxDistanceWithNormalSlowMo,
        needsExtremeSlowMo,
      })

      speedTimeline?.kill()
      speedTimeline = gsap
        .timeline({
          onComplete: () => {
            set({ isSlowMo: false, slowMoTimeRemaining: answerTimeDuration })
            gsap.set('#slow-mo-bar', { scaleX: 0, opacity: 0 })
          },
        })
        // Slow time down as the answer gate approaches
        .to(timeTweenTarget, {
          duration: SLOW_MO_RAMP_DURATION,
          ease: 'power2.out',
          value: SLOW_MO_MULTIPLIER,
          onUpdate: () => {
            set({ timeMultiplier: timeTweenTarget.value })
          },
        })

      // Slow down even further if needed for very long answer durations
      if (needsExtremeSlowMo) {
        speedTimeline.to(
          timeTweenTarget,
          {
            duration: SLOW_MO_RAMP_DURATION,
            ease: 'power3.out',
            value: SLOW_MO_EXTREME_MULTIPLIER,
            onUpdate: () => {
              set({ timeMultiplier: timeTweenTarget.value })
            },
          },
          '+=1.0',
        ) // Slight overlap to avoid pause between tweens
      }

      speedTimeline
        .to(
          '#slow-mo-bar',
          {
            scaleX: 1,
            duration: answerTimeDuration,
            ease: 'none',
            onUpdate: () => {
              set({ slowMoTimeRemaining: answerTimeRemaining.value })
            },
          },
          SLOW_MO_RAMP_DURATION,
        )
        // Speed back up again
        .to(timeTweenTarget, {
          duration: 0.4,
          ease: 'power1.out',
          value: 1.0,
          onUpdate: () => {
            set({ timeMultiplier: timeTweenTarget.value })
          },
        })
    },
    updatePlayerPosition: ({ pos, lanes }) => {
      const currentPlayerLane = lanes[1] * 3 + lanes[0] // Convert to 0-8 index
      set({
        playerPosition: pos,
        currentPlayerLane,
      })
    },
    onObstacleHit: (data: ObstacleUserData) => {
      playSoundFX(SoundFX.OBSTACLE_HIT)
      const scoreEvent: ScoreEvent = {
        type: 'hit',
        obstacleId: data.obstacleId,
        points: POINTS_OBSTACLE_HIT,
        timestamp: Date.now(),
      }
      console.warn('Obstacle hit!', { scoreEvent })
      set((state) => ({
        points: state.points + POINTS_OBSTACLE_HIT,
        scoreEvents: [...state.scoreEvents, scoreEvent],
        streak: 0, // Reset streak on obstacle hit
      }))
    },
    onObstacleAvoided: (data: ObstacleAvoidedUserData) => {
      playSoundFX(SoundFX.OBSTACLE_AVOIDED)
      const scoreEvents = get().scoreEvents
      // If this obstacle has been hit, don't reward avoidance
      const hasHitThisObstacle = scoreEvents.some((e) => e.type === 'hit' && e.obstacleId === data.obstacleId)
      if (hasHitThisObstacle) {
        console.warn('Obstacle already hit, no avoidance points', { data })
        return
      }
      const scoreEvent: ScoreEvent = {
        type: 'avoided',
        obstacleId: data.obstacleId,
        points: POINTS_OBSTACLE_AVOIDED,
        timestamp: Date.now(),
      }
      console.warn('Obstacle avoided!', { scoreEvent })
      set((state) => ({
        points: state.points + POINTS_OBSTACLE_AVOIDED,
        scoreEvents: [...state.scoreEvents, scoreEvent],
      }))
    },
    onAnswerHit: (data: AnswerGateUserData) => {
      // Record the answer hit
      const answerHit: AnswerHit = {
        ...data,
        timestamp: Date.now(),
      }
      console.warn('Answer hit!', { answerHit })

      if (data.isCorrect) {
        playSoundFX(SoundFX.CORRECT_ANSWER)
        set((s) => {
          const newCurrentStreak = s.streak + 1
          const newMaxStreak = Math.max(s.maxStreak, newCurrentStreak)
          // Remove any previous answers for this question in case of multiple hits
          const cleanAnswersHit = [...s.answersHit].filter((hit) => hit.questionId !== answerHit.questionId)
          return {
            streak: newCurrentStreak,
            maxStreak: newMaxStreak,
            answersHit: [...cleanAnswersHit, answerHit],
          }
        })
      } else {
        playSoundFX(SoundFX.WRONG_ANSWER)
        set((s) => {
          const cleanAnswersHit = [...s.answersHit].filter((hit) => hit.questionId !== answerHit.questionId)
          return {
            streak: 0,
            answersHit: [...cleanAnswersHit, answerHit],
          }
        })
      }
    },
  }))
}

type Props = PropsWithChildren<CreateStoreParams>

export const LevelProvider: FC<Props> = ({ children, ...storeParams }) => {
  const store = useRef<LevelStore>(createLevelStore(storeParams))

  useEffect(() => {
    return () => {
      // Any cleanup logic if needed when LevelProvider is unmounted
    }
  }, [])

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
  const phases = [LevelPhase.CONFIG, LevelPhase.INTRO]

  if (showOnboarding) phases.push(LevelPhase.ONBOARDING)

  const questionPhases = questions.flatMap(() =>
    withObstacles ? OBSTACLE_QUESTION_PHASE_CYCLE : QUESTION_ONLY_PHASE_CYCLE,
  )

  phases.push(...questionPhases)
  phases.push(LevelPhase.OUTRO)
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
