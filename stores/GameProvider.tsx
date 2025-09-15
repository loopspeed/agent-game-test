import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

import type { AnswerGateUserData, ObstacleAvoidedUserData, ObstacleUserData } from '@/model/game'
import { SAMPLE_COURSE, SAMPLE_QUESTIONS } from '@/resources/course'
import { type ChapterRun, useHistoryStore } from '@/stores/useHistoryStore'

import { LevelProvider } from './LevelProvider'

export enum GameStage {
  READY = 'READY',
  PLAYING = 'PLAYING',
  COMPLETED = 'COMPLETED',
}

export type AnswerHit = {
  questionId: string
  answerId: string | null // null for misses
  isCorrect: boolean // True if correct, false if incorrect or missed
  timestamp: number
}

// Currently score events only track obstacle hits/avoids, not answers
export type ScoreEvent = {
  type: 'hit' | 'avoided'
  obstacleId: string
  points: number
  timestamp: number
}

type GameState = {
  courseId: string
  chapterId: string

  stage: GameStage
  start: () => void
  reset: () => void

  gameStartTime: number
  points: number
  scoreEvents: ScoreEvent[]
  streak: number
  maxStreak: number
  answersHit: AnswerHit[]

  // Game events
  onObstacleHit: (data: ObstacleUserData) => void
  onObstacleAvoided: (data: ObstacleAvoidedUserData) => void
  onAnswerHit: (data: AnswerGateUserData) => void
  onCompleted: () => void
}

type GameStateStore = StoreApi<GameState>
const GameContext = createContext<GameStateStore>(undefined!)

export const GRID_SQUARE_SIZE_M = 1.6 // Meters
export const LANES_Y_OFFSET = -0.6 // Move them down to avoid question
export const LANES_X = [-1, 0, 1].map((x) => x * GRID_SQUARE_SIZE_M)
export const LANES_Y = [-1, 0, 1].map((y) => y * GRID_SQUARE_SIZE_M + LANES_Y_OFFSET)

export const CAMERA_FAR = 50
export const SPAWN_OBSTACLE_Z = -40 as const
export const KILL_OBSTACLE_Z = 9 as const

// Points system constants
export const POINTS_OBSTACLE_HIT = -10 as const
export const POINTS_OBSTACLE_AVOIDED = 5 as const
export const POINTS_ANSWER_CORRECT = 20 as const
export const POINTS_ANSWER_INCORRECT = -5 as const

const INITIAL_STATE: Pick<GameState, 'stage' | 'streak' | 'maxStreak' | 'points' | 'scoreEvents' | 'answersHit'> = {
  stage: GameStage.READY,
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
  // playSoundEffect,
}: {
  courseId: string
  chapterId: string
  addChapterRunToHistory: (run: Omit<ChapterRun, 'id'>) => void
}) => {
  return createStore<GameState>()((set, get) => ({
    ...INITIAL_STATE,
    courseId,
    chapterId,
    gameStartTime: 0,

    start: () => {
      // Start the game
      set({ stage: GameStage.PLAYING, gameStartTime: Date.now() })
    },
    reset: () => {
      // Sets it to ready to begin again.
      set({ ...INITIAL_STATE })
    },
    onObstacleHit: (data: ObstacleUserData) => {
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
        set((s) => {
          const cleanAnswersHit = [...s.answersHit].filter((hit) => hit.questionId !== answerHit.questionId)
          return {
            streak: 0,
            answersHit: [...cleanAnswersHit, answerHit],
          }
        })
      }
    },
    onCompleted: () => {
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
        stage: GameStage.COMPLETED,
      })
    },
  }))
}

export const GameProvider: FC<PropsWithChildren> = ({ children }) => {
  // const playSoundEffect = useSoundStore((s) => s.playSoundEffect)
  const addChapterRunToHistory = useHistoryStore((s) => s.addChapterRun)
  // Create the game store with incoming configuration
  const gameStore = useRef<GameStateStore>(
    createGameStore({ courseId: SAMPLE_COURSE.id, chapterId: SAMPLE_COURSE.chapters[0].id, addChapterRunToHistory }),
  )

  return (
    <GameContext.Provider value={gameStore.current}>
      <LevelProvider questions={SAMPLE_COURSE.chapters[0].questions}>{children}</LevelProvider>
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
