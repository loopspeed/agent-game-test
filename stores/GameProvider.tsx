import { type Vector3Tuple } from '@react-three/rapier'
import gsap from 'gsap'
import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

import { Answer, Question, SAMPLE_QUESTIONS } from '@/data/questions'
import { CourseRun, useHistoryStore } from '@/stores/useHistoryStore'

export enum GameStage {
  INTRO = 'INTRO',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export type AnswerHit = {
  questionId: string
  answerId: string | null // null for misses
  isCorrect: boolean
  timestamp: number
}

export type GameState = {
  stage: GameStage
  setStage: (stage: GameStage) => void

  // Course metadata
  courseId: string
  courseName: string
  gameStartTime: number

  timeMultiplier: number
  setTimeMultiplier: (value: number) => void
  slowMoTimeRemaining: number
  isSlowMo: boolean
  goSlowMo: () => void

  maxObstacles: number
  setMaxObstacles: (value: number) => void
  spawnInterval: number
  setSpawnInterval: (value: number) => void

  playerPosition: Vector3Tuple
  setPlayerPosition: (pos: Vector3Tuple) => void

  health: number
  currentStreak: number
  maxStreak: number
  resetHealth: () => void
  onObstacleHit: () => void
  onAnswerHit: (isCorrect: boolean, answerId: string | null) => void
  onGameOver: () => void

  // Questions
  questions: Question[]
  currentQuestion: Question
  currentQuestionIndex: number
  goToNextQuestion: () => void

  answerGatesMapping: Array<(Answer | null)[]>
  answerOccupiedLanes: number[]
  // Answer tracking
  answersHit: AnswerHit[]

  reset: () => void
  startNewGame: () => void
}

type GameStateStore = StoreApi<GameState>
const GameContext = createContext<GameStateStore>(undefined!)

export const GRID_SQUARE_SIZE_M = 1.6 // Meters
export const LANES_Y_OFFSET = -0.6 // Move them down to avoid question
export const LANES_X = [-1, 0, 1].map((x) => x * GRID_SQUARE_SIZE_M)
export const LANES_Y = [-1, 0, 1].map((y) => y * GRID_SQUARE_SIZE_M + LANES_Y_OFFSET)

export const SPAWN_OBSTACLE_Z = -30 as const
export const KILL_OBSTACLE_Z = 4 as const

export const MAX_HEALTH = 3 as const

const SLOW_MO_DURATION = 2.0

const INITIAL_STATE: Pick<
  GameState,
  | 'stage'
  | 'courseId'
  | 'courseName'
  | 'gameStartTime'
  | 'timeMultiplier'
  | 'slowMoTimeRemaining'
  | 'spawnInterval'
  | 'isSlowMo'
  | 'maxObstacles'
  | 'currentStreak'
  | 'maxStreak'
  | 'playerPosition'
  | 'health'
  | 'currentQuestionIndex'
  | 'answersHit'
  | 'questions'
  | 'answerOccupiedLanes'
> = {
  stage: GameStage.INTRO,
  courseId: 'ai-history-course',
  courseName: 'AI History Course',
  gameStartTime: Date.now(),
  timeMultiplier: 1,
  slowMoTimeRemaining: SLOW_MO_DURATION,
  isSlowMo: false,
  maxObstacles: 10,
  spawnInterval: 0.8,
  currentStreak: 0,
  maxStreak: 0,
  playerPosition: [0, 0, 0] as Vector3Tuple,
  health: MAX_HEALTH,
  questions: SAMPLE_QUESTIONS,
  currentQuestionIndex: 0,
  answersHit: [],
  answerOccupiedLanes: [],
}

const createGameStore = ({
  questions,
  addCourseRunToHistory,
}: {
  questions: Question[]
  addCourseRunToHistory: (run: Omit<CourseRun, 'id'>) => void
}) => {
  let speedTimeline: GSAPTimeline
  // Create values which can be animated using GSAP (synced with store values which can't be mutated directly)
  const timeTweenTarget = { value: 1 }
  const slowMoTimeRemainingTarget = { value: SLOW_MO_DURATION }

  return createStore<GameState>()((set, get) => ({
    ...INITIAL_STATE,
    currentQuestion: questions[0],
    answerGatesMapping: mapAnswersToGatePositions(questions),

    setStage: (stage: GameStage) => {
      if (stage === GameStage.PLAYING) {
        set({ stage, gameStartTime: Date.now() })
      } else {
        set({ stage })
      }
    },
    setTimeMultiplier: (timeMultiplier: number) => set({ timeMultiplier }),
    goSlowMo: () => {
      if (get().isSlowMo) return

      set({ isSlowMo: true })
      gsap.set('#slow-mo-bar', { scaleX: 1, opacity: 1 })

      console.warn('going slow mo')

      speedTimeline?.kill()
      speedTimeline = gsap
        .timeline({
          onComplete: () => {
            gsap.set('#slow-mo-bar', { scaleX: 1, opacity: 0 })
            set({ isSlowMo: false, slowMoTimeRemaining: SLOW_MO_DURATION })
          },
        })
        // Slow down..
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
          duration: SLOW_MO_DURATION,
          ease: 'none',
          onUpdate: () => {
            set({ slowMoTimeRemaining: slowMoTimeRemainingTarget.value })
          },
        })
        // Speed back up again.
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
          SLOW_MO_DURATION + 0.6,
        )
    },
    setMaxObstacles: (maxObstacles: number) => set({ maxObstacles }),
    setSpawnInterval: (spawnInterval: number) => set({ spawnInterval }),
    setPlayerPosition: (pos: [number, number, number]) => set({ playerPosition: pos }),
    resetHealth: () => set({ health: MAX_HEALTH }),
    onObstacleHit: () => {
      const currentHealth = get().health
      const newHealth = Math.max(currentHealth - 1, 0)
      if (newHealth === 0) {
        get().onGameOver()
      } else {
        set({ health: newHealth })
      }
    },
    onAnswerHit: (isCorrect: boolean, answerId: string | null) => {
      const currentHealth = get().health
      const currentQuestion = get().currentQuestion

      // Record the answer hit
      const answerHit: AnswerHit = {
        questionId: currentQuestion.id,
        answerId,
        isCorrect,
        timestamp: Date.now(),
      }

      if (isCorrect) {
        const newHealth = Math.min(currentHealth + 1, MAX_HEALTH)
        set((s) => {
          const newCurrentStreak = s.currentStreak + 1
          const newMaxStreak = Math.max(s.maxStreak, newCurrentStreak)
          return {
            currentStreak: newCurrentStreak,
            maxStreak: newMaxStreak,
            health: newHealth,
            answersHit: [...s.answersHit, answerHit],
          }
        })
      } else {
        const newHealth = Math.max(currentHealth - 1, 0)
        if (newHealth === 0) {
          set((s) => ({
            currentStreak: 0,
            health: newHealth,
            answersHit: [...s.answersHit, answerHit],
          }))
          get().onGameOver()
        } else {
          set((s) => ({
            currentStreak: 0,
            health: newHealth,
            answersHit: [...s.answersHit, answerHit],
          }))
        }
      }
    },
    onGameOver: () => {
      const state = get()
      const completionTime = Date.now() - state.gameStartTime
      const correctAnswers = state.answersHit.filter((hit) => hit.isCorrect).length
      const incorrectAnswers = state.answersHit.filter((hit) => !hit.isCorrect).length
      const totalAnswered = correctAnswers + incorrectAnswers
      const accuracyPercentage = totalAnswered > 0 ? (correctAnswers / totalAnswered) * 100 : 0

      addCourseRunToHistory({
        courseId: state.courseId,
        courseName: state.courseName,
        timestamp: Date.now(),
        answersHit: state.answersHit,
        maxStreak: state.maxStreak,
        finalHealth: state.health,
        questionsCompleted: state.currentQuestionIndex,
        totalQuestions: state.questions.length,
        correctAnswers,
        incorrectAnswers,
        accuracyPercentage: Math.round(accuracyPercentage * 100) / 100,
        completionTime,
      })

      set({
        stage: GameStage.GAME_OVER,
      })
    },
    goToNextQuestion: () => {
      set((state) => {
        // If it's the end, complete the game
        const nextIndex = state.currentQuestionIndex + 1
        if (nextIndex >= questions.length) {
          // Handle game completion logic here
          get().onGameOver()
          return {}
        }

        const answerMapping = state.answerGatesMapping[state.currentQuestionIndex]
        const answerOccupiedLanes: number[] = []
        answerMapping.forEach((answer, gridIndex) => {
          if (!!answer) answerOccupiedLanes.push(gridIndex)
        })

        return { currentQuestionIndex: nextIndex, currentQuestion: questions[nextIndex], answerOccupiedLanes }
      })
    },

    reset: () =>
      set({
        ...INITIAL_STATE,
        currentQuestion: questions[0],
        answerGatesMapping: mapAnswersToGatePositions(questions),
      }),

    startNewGame: () =>
      set({
        ...INITIAL_STATE,
        gameStartTime: Date.now(),
        currentQuestion: questions[0],
        answerGatesMapping: mapAnswersToGatePositions(questions),
      }),
  }))
}

const GameProvider: FC<PropsWithChildren> = ({ children }) => {
  // Save to history store
  const addCourseRunToHistory = useHistoryStore((s) => s.addCourseRun)
  const gameStore = useRef<GameStateStore>(createGameStore({ questions: SAMPLE_QUESTIONS, addCourseRunToHistory }))
  return <GameContext.Provider value={gameStore.current}>{children}</GameContext.Provider>
}

export default GameProvider

export function useGameStore<T>(selector: (state: GameState) => T): T {
  const gameStore = useContext(GameContext)
  if (!gameStore) throw new Error('Missing GameContext.Provider in the tree')
  return useStore(gameStore, selector)
}

export function useGameStoreAPI(): GameStateStore {
  const gameStore = useContext(GameContext)
  if (!gameStore) throw new Error('Missing GameContext.Provider in the tree')
  return gameStore
}

/**
 * Maps answers to random positions in a 3x3 grid for each question.
 * Uses Fisher-Yates shuffle with Math.random() for true randomness each runtime.
 *
 * Grid positions are indexed as:
 * 0 1 2
 * 3 4 5
 * 6 7 8
 */
const mapAnswersToGatePositions = (questions: Question[]): Array<(Answer | null)[]> => {
  const mapping: Array<(Answer | null)[]> = []

  questions.forEach(({ answers }) => {
    const answerMapping = new Array(9).fill(null)

    // Generate all possible positions (0-8) for the 3x3 grid
    const availablePositions = Array.from({ length: 9 }, (_, i) => i)

    // Shuffle the positions using Fisher-Yates algorithm with Math.random()
    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]]
    }

    // Take only the number of positions we need for this question's answers
    const selectedPositions = availablePositions.slice(0, answers.length)

    // Assign each answer to a random position
    answers.forEach((answer, index) => {
      answerMapping[selectedPositions[index]] = answer
    })

    mapping.push(answerMapping)
  })

  return mapping
}
