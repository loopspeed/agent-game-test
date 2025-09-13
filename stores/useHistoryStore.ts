import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { AnswerHit } from './GameProvider'

export type ChapterRun = {
  id: string
  courseId: string // identifier for the course
  chapterId: string // identifier for the chapter
  timestamp: number
  points: number
  answersHit: AnswerHit[]
  questionsCompleted: number
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  accuracyPercentage: number
  completionTime: number // in milliseconds
}

export type HistoryState = {
  chapterRuns: ChapterRun[]
  addChapterRun: (chapterRun: Omit<ChapterRun, 'id'>) => void
  getChapterRuns: (courseId?: string) => ChapterRun[]
  getLastRun: () => ChapterRun | null
  clearHistory: () => void
  getStats: () => {
    totalRuns: number
    averageAccuracy: number
    mostPoints: number
    totalQuestionsAnswered: number
    totalCorrectAnswers: number
  }
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      chapterRuns: [],

      addChapterRun: (courseRunData) => {
        console.warn('[useHistoryStore] Adding course run:', courseRunData)
        const courseRun: ChapterRun = {
          ...courseRunData,
          id: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        }
        console.warn('[useHistoryStore] Generated course run with ID:', courseRun.id)

        set((state) => {
          const newState = {
            chapterRuns: [...state.chapterRuns, courseRun],
          }
          return newState
        })
      },

      getChapterRuns: (courseId) => {
        const runs = get().chapterRuns
        console.warn(
          `[useHistoryStore] getChapterRuns called with courseId: ${courseId}, found ${runs.length} total runs`,
        )
        if (courseId) {
          const filtered = runs.filter((run) => run.courseId === courseId)
          console.warn(`[useHistoryStore] Filtered to ${filtered.length} runs for courseId: ${courseId}`)
          return filtered
        }
        return runs
      },

      getLastRun: () => {
        const runs = get().chapterRuns
        console.warn(`[useHistoryStore] getLastRun called, found ${runs.length} total runs`)
        if (runs.length === 0) {
          console.warn('[useHistoryStore] No runs found, returning null')
          return null
        }
        const lastRun = runs[runs.length - 1]
        console.warn('[useHistoryStore] Returning last run with ID:', lastRun.id)
        return lastRun
      },

      clearHistory: () => set({ chapterRuns: [] }),

      getStats: () => {
        const runs = get().chapterRuns
        console.warn(`[useHistoryStore] getStats called with ${runs.length} runs`)
        if (runs.length === 0) {
          console.warn('[useHistoryStore] No runs found, returning zero stats')
          return {
            totalRuns: 0,
            averageAccuracy: 0,
            mostPoints: 0,
            totalQuestionsAnswered: 0,
            totalCorrectAnswers: 0,
          }
        }

        const totalRuns = runs.length
        const totalCorrectAnswers = runs.reduce((sum, run) => sum + run.correctAnswers, 0)
        const totalQuestionsAnswered = runs.reduce((sum, run) => sum + (run.correctAnswers + run.incorrectAnswers), 0)
        const averageAccuracy = totalQuestionsAnswered > 0 ? (totalCorrectAnswers / totalQuestionsAnswered) * 100 : 0
        const mostPoints = Math.max(...runs.map((run) => run.points))

        const stats = {
          totalRuns,
          averageAccuracy: Math.round(averageAccuracy * 100) / 100,
          mostPoints,
          totalQuestionsAnswered,
          totalCorrectAnswers,
        }
        console.warn('[useHistoryStore] Calculated stats:', stats)

        return stats
      },
    }),
    {
      name: 'history',
    },
  ),
)
