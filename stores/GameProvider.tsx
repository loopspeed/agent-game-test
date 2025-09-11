import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

import type { Chapter } from '@/model/content'
import type { AnswerGateUserData } from '@/model/game'
import { SAMPLE_COURSE, SAMPLE_QUESTIONS } from '@/resources/course'
import { type ChapterRun, useHistoryStore } from '@/stores/useHistoryStore'

import { LevelProvider } from './LevelProvider'

export enum GameStage {
  // TODO: these don't quite align with level just yet, a better combo will be needed.
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

export type ScoreEvent = {
  type: 'obstacle_hit' | 'obstacle_avoided' | 'answer_correct' | 'answer_incorrect'
  points: number
  timestamp: number
}

type GameState = {
  courseId: string
  chapterId: string

  stage: GameStage
  setStage: (stage: GameStage) => void

  // Course metadata
  gameStartTime: number

  // Points system
  points: number
  scoreEvents: ScoreEvent[]
  streak: number
  maxStreak: number

  // Game events
  onObstacleHit: () => void
  onObstacleAvoided: () => void
  onAnswerHit: (data: AnswerGateUserData) => void
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

export const CAMERA_FAR = 50
export const SPAWN_OBSTACLE_Z = -40 as const
export const KILL_OBSTACLE_Z = 4 as const

// Points system constants
export const POINTS_OBSTACLE_HIT = -10 as const
export const POINTS_OBSTACLE_AVOIDED = 5 as const
export const POINTS_ANSWER_CORRECT = 20 as const
export const POINTS_ANSWER_INCORRECT = -5 as const

const INITIAL_STATE: Pick<
  GameState,
  'stage' | 'gameStartTime' | 'streak' | 'maxStreak' | 'points' | 'scoreEvents' | 'answersHit'
> = {
  stage: GameStage.INTRO,
  gameStartTime: Date.now(),
  streak: 0,
  maxStreak: 0,
  points: 0,
  scoreEvents: [],
  answersHit: [],
}

const createGameStore = ({
  courseId,
  chapterId,
  addChapterRunToHistory,
}: {
  courseId: string
  chapterId: string
  addChapterRunToHistory: (run: Omit<ChapterRun, 'id'>) => void
}) => {
  return createStore<GameState>()((set, get) => ({
    ...INITIAL_STATE,
    courseId,
    chapterId,
    setStage: (stage: GameStage) => {
      if (stage === GameStage.PLAYING) {
        set({ stage, gameStartTime: Date.now() })
      } else {
        set({ stage })
      }
    },
    onObstacleHit: () => {
      const scoreEvent: ScoreEvent = {
        type: 'obstacle_hit',
        points: POINTS_OBSTACLE_HIT,
        timestamp: Date.now(),
      }
      set((state) => ({
        points: state.points + POINTS_OBSTACLE_HIT,
        scoreEvents: [...state.scoreEvents, scoreEvent],
        streak: 0, // Reset streak on obstacle hit
      }))
    },
    onObstacleAvoided: () => {
      const scoreEvent: ScoreEvent = {
        type: 'obstacle_avoided',
        points: POINTS_OBSTACLE_AVOIDED,
        timestamp: Date.now(),
      }
      set((state) => ({
        points: state.points + POINTS_OBSTACLE_AVOIDED,
        scoreEvents: [...state.scoreEvents, scoreEvent],
      }))
    },
    onAnswerHit: (data: AnswerGateUserData) => {
      // Record the answer hit - we'll need to get the current question from WorldProvider
      const answerHit: AnswerHit = {
        ...data,
        timestamp: Date.now(),
      }

      if (data.isCorrect) {
        set((s) => {
          const newCurrentStreak = s.streak + 1
          const newMaxStreak = Math.max(s.maxStreak, newCurrentStreak)
          return {
            streak: newCurrentStreak,
            maxStreak: newMaxStreak,
            answersHit: [...s.answersHit, answerHit],
          }
        })
      } else {
        set((s) => ({
          streak: 0,
          answersHit: [...s.answersHit, answerHit],
        }))
      }
    },
    onGameOver: () => {
      const state = get()
      const completionTime = Date.now() - state.gameStartTime
      const correctAnswers = state.answersHit.filter((hit) => hit.isCorrect).length
      const incorrectAnswers = state.answersHit.filter((hit) => !hit.isCorrect).length
      const totalAnswered = correctAnswers + incorrectAnswers
      const accuracyPercentage = totalAnswered > 0 ? (correctAnswers / totalAnswered) * 100 : 0

      addChapterRunToHistory({
        courseId,
        chapterId,
        timestamp: Date.now(),
        answersHit: state.answersHit,
        points: state.points,
        questionsCompleted: totalAnswered,
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
  const addChapterRunToHistory = useHistoryStore((s) => s.addChapterRun)
  // Create the game store with incoming configuration
  const gameStore = useRef<GameStateStore>(
    createGameStore({ courseId: SAMPLE_COURSE.id, chapterId: SAMPLE_COURSE.chapters[0].id, addChapterRunToHistory }),
  )

  return (
    <GameContext.Provider value={gameStore.current}>
      <LevelProvider questions={SAMPLE_QUESTIONS}>{children}</LevelProvider>
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
