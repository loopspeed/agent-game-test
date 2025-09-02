import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { AnswerHit } from './GameProvider'

export type CourseRun = {
  id: string
  courseId: string // identifier for the question set used
  courseName: string // display name for the course
  timestamp: number
  answersHit: AnswerHit[]
  maxStreak: number
  finalHealth: number
  questionsCompleted: number
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  accuracyPercentage: number
  completionTime: number // in milliseconds
}

export type HistoryState = {
  courseRuns: CourseRun[]
  addCourseRun: (courseRun: Omit<CourseRun, 'id'>) => void
  getCourseRuns: (courseId?: string) => CourseRun[]
  getLastRun: () => CourseRun | null
  clearHistory: () => void
  getStats: () => {
    totalRuns: number
    averageAccuracy: number
    bestStreak: number
    totalQuestionsAnswered: number
    totalCorrectAnswers: number
  }
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      courseRuns: [],

      addCourseRun: (courseRunData) => {
        const courseRun: CourseRun = {
          ...courseRunData,
          id: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        }

        set((state) => ({
          courseRuns: [...state.courseRuns, courseRun],
        }))
      },

      getCourseRuns: (courseId) => {
        const runs = get().courseRuns
        if (courseId) {
          return runs.filter((run) => run.courseId === courseId)
        }
        return runs
      },

      getLastRun: () => {
        const runs = get().courseRuns
        if (runs.length === 0) return null
        return runs[runs.length - 1]
      },

      clearHistory: () => set({ courseRuns: [] }),

      getStats: () => {
        const runs = get().courseRuns
        if (runs.length === 0) {
          return {
            totalRuns: 0,
            averageAccuracy: 0,
            bestStreak: 0,
            totalQuestionsAnswered: 0,
            totalCorrectAnswers: 0,
          }
        }

        const totalRuns = runs.length
        const totalCorrectAnswers = runs.reduce((sum, run) => sum + run.correctAnswers, 0)
        const totalQuestionsAnswered = runs.reduce((sum, run) => sum + (run.correctAnswers + run.incorrectAnswers), 0)
        const averageAccuracy = totalQuestionsAnswered > 0 ? (totalCorrectAnswers / totalQuestionsAnswered) * 100 : 0
        const bestStreak = Math.max(...runs.map((run) => run.maxStreak))

        return {
          totalRuns,
          averageAccuracy: Math.round(averageAccuracy * 100) / 100,
          bestStreak,
          totalQuestionsAnswered,
          totalCorrectAnswers,
        }
      },
    }),
    {
      name: 'course-history-storage',
    },
  ),
)
