import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

import { SAMPLE_QUESTIONS } from '@/resources/questions'
import { type CourseRun, useHistoryStore } from '@/stores/useHistoryStore'

import { WorldProvider } from './WorldProvider'

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

type GameState = {
  stage: GameStage
  setStage: (stage: GameStage) => void

  // Course metadata
  courseId: string
  courseName: string
  gameStartTime: number

  health: number
  streak: number
  maxStreak: number
  resetHealth: () => void
  onObstacleHit: () => void
  onAnswerHit: (isCorrect: boolean, answerId: string | null) => void
  onGameOver: () => void

  answersHit: AnswerHit[]

  resetStore: () => void
  restartGame: () => void
}

type GameStateStore = StoreApi<GameState>
const GameContext = createContext<GameStateStore>(undefined!)

export const GRID_SQUARE_SIZE_M = 1.6 // Meters
export const LANES_Y_OFFSET = -0.6 // Move them down to avoid question
export const LANES_X = [-1, 0, 1].map((x) => x * GRID_SQUARE_SIZE_M)
export const LANES_Y = [-1, 0, 1].map((y) => y * GRID_SQUARE_SIZE_M + LANES_Y_OFFSET)
export const SPAWN_OBSTACLE_Z = -30 as const
export const KILL_OBSTACLE_Z = 4 as const
export const MAX_HEALTH = 7 as const

const INITIAL_STATE: Pick<
  GameState,
  'stage' | 'courseId' | 'courseName' | 'gameStartTime' | 'streak' | 'maxStreak' | 'health' | 'answersHit'
> = {
  stage: GameStage.INTRO,
  courseId: 'ai-history-course',
  courseName: 'AI History Course',
  gameStartTime: Date.now(),
  streak: 0,
  maxStreak: 0,
  health: MAX_HEALTH,
  answersHit: [],
}

const createGameStore = ({
  addCourseRunToHistory,
}: {
  addCourseRunToHistory: (run: Omit<CourseRun, 'id'>) => void
}) => {
  return createStore<GameState>()((set, get) => ({
    ...INITIAL_STATE,
    setStage: (stage: GameStage) => {
      if (stage === GameStage.PLAYING) {
        set({ stage, gameStartTime: Date.now() })
        // Note: Rhythm system start/stop/reset is now handled by components
        // that directly access WorldProvider via useWorldStore
      } else {
        set({ stage })
      }
    },
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

      // Record the answer hit - we'll need to get the current question from WorldProvider
      const answerHit: AnswerHit = {
        questionId: 'current-question', // This will need to be passed from component
        answerId,
        isCorrect,
        timestamp: Date.now(),
      }

      if (isCorrect) {
        const newHealth = Math.min(currentHealth + 1, MAX_HEALTH)
        set((s) => {
          const newCurrentStreak = s.streak + 1
          const newMaxStreak = Math.max(s.maxStreak, newCurrentStreak)
          return {
            streak: newCurrentStreak,
            maxStreak: newMaxStreak,
            health: newHealth,
            answersHit: [...s.answersHit, answerHit],
          }
        })
      } else {
        const newHealth = Math.max(currentHealth - 1, 0)
        if (newHealth === 0) {
          set((s) => ({
            streak: 0,
            health: newHealth,
            answersHit: [...s.answersHit, answerHit],
          }))
          get().onGameOver()
        } else {
          set((s) => ({
            streak: 0,
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
        questionsCompleted: 0, // This will need to be tracked elsewhere
        totalQuestions: SAMPLE_QUESTIONS.length,
        correctAnswers,
        incorrectAnswers,
        accuracyPercentage: Math.round(accuracyPercentage * 100) / 100,
        completionTime,
      })

      set({
        stage: GameStage.GAME_OVER,
      })
    },
    resetStore: () => {
      set({
        ...INITIAL_STATE,
      })
    },
    restartGame: () => {
      set({
        ...INITIAL_STATE,
        gameStartTime: Date.now(),
      })
    },
  }))
}

export const GameProvider: FC<PropsWithChildren> = ({ children }) => {
  const addCourseRunToHistory = useHistoryStore((s) => s.addCourseRun)
  // Create the game store with incoming configuration
  const gameStore = useRef<GameStateStore>(createGameStore({ addCourseRunToHistory }))

  return (
    <GameContext.Provider value={gameStore.current}>
      {/* World provider handles rhythm system and questions */}
      <WorldProvider questions={SAMPLE_QUESTIONS}>{children}</WorldProvider>
    </GameContext.Provider>
  )
}

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
