import { useMemo } from 'react'

import { AnswerHit, useGameStore } from '@/stores/GameProvider'
import { CourseRun, useHistoryStore } from '@/stores/useHistoryStore'

export type GameOverData = {
  // Current run data
  currentRun: {
    answersHit: AnswerHit[]
    maxStreak: number
    correctAnswers: number
    incorrectAnswers: number
    accuracyPercentage: number
    questionsCompleted: number
    totalQuestions: number
    finalHealth: number
    completionTime: number
  }

  // Historical data
  pastRuns: CourseRun[]
  stats: {
    totalRuns: number
    averageAccuracy: number
    bestStreak: number
    totalQuestionsAnswered: number
    totalCorrectAnswers: number
  }
}

/**
 * Hook to get both current run and historical data for the Game Over screen
 */
export const useGameOverData = (): GameOverData => {
  const courseId = useGameStore((state) => state.courseId)

  // Get the most recent run from history store instead of recalculating
  const lastRun = useHistoryStore((state) => state.getLastRun())

  // Get historical data using memoized selectors to avoid infinite re-renders
  const courseRuns = useHistoryStore((state) => state.courseRuns)
  const pastRuns = useMemo(() => {
    const filtered = courseRuns.filter((run) => run.courseId === courseId)
    console.warn(`[useGameOverData] Filtered to ${filtered.length} runs for courseId: ${courseId}`)
    return filtered
  }, [courseRuns, courseId])

  const stats = useMemo(() => {
    if (courseRuns.length === 0) {
      return {
        totalRuns: 0,
        averageAccuracy: 0,
        bestStreak: 0,
        totalQuestionsAnswered: 0,
        totalCorrectAnswers: 0,
      }
    }

    const totalRuns = courseRuns.length
    const totalCorrectAnswers = courseRuns.reduce((sum, run) => sum + run.correctAnswers, 0)
    const totalQuestionsAnswered = courseRuns.reduce((sum, run) => sum + (run.correctAnswers + run.incorrectAnswers), 0)
    const averageAccuracy = totalQuestionsAnswered > 0 ? (totalCorrectAnswers / totalQuestionsAnswered) * 100 : 0
    const bestStreak = Math.max(...courseRuns.map((run) => run.maxStreak))

    return {
      totalRuns,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      bestStreak,
      totalQuestionsAnswered,
      totalCorrectAnswers,
    }
  }, [courseRuns])

  // Create currentRun from the last run in history, or fallback to empty data
  const currentRun = lastRun
    ? {
        answersHit: lastRun.answersHit,
        maxStreak: lastRun.maxStreak,
        correctAnswers: lastRun.correctAnswers,
        incorrectAnswers: lastRun.incorrectAnswers,
        accuracyPercentage: lastRun.accuracyPercentage,
        questionsCompleted: lastRun.questionsCompleted,
        totalQuestions: lastRun.totalQuestions,
        finalHealth: lastRun.finalHealth,
        completionTime: lastRun.completionTime,
      }
    : {
        answersHit: [],
        maxStreak: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracyPercentage: 0,
        questionsCompleted: 0,
        totalQuestions: 0,
        finalHealth: 0,
        completionTime: 0,
      }

  console.warn('[useGameOverData] Current run from history:', currentRun)
  console.warn('[useGameOverData] Historical data:', { pastRuns: pastRuns.length, stats })

  return {
    currentRun,
    pastRuns,
    stats,
  }
}
