import { useMemo } from 'react'

import { useGameStore } from '@/stores/GameProvider'
import { ChapterRun, useHistoryStore } from '@/stores/useHistoryStore'

export type GameOverData = {
  // Current run data
  lastRun: ChapterRun | null
  // Historical data
  pastRuns: ChapterRun[]
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
  const chapterId = useGameStore((state) => state.chapterId)

  // Get the most recent run from history store instead of recalculating
  const lastRun = useHistoryStore((state) => state.getLastRun())

  // Get historical data using memoized selectors to avoid infinite re-renders
  const chapterRuns = useHistoryStore((state) => state.chapterRuns)
  const pastRuns = useMemo(() => {
    const filtered = chapterRuns.filter((run) => run.chapterId === chapterId)
    console.warn(`[useGameOverData] Filtered to ${filtered.length} runs for chapterId: ${chapterId}`)
    return filtered
  }, [chapterRuns, chapterId])

  const stats = useMemo(() => {
    if (chapterRuns.length === 0) {
      return {
        totalRuns: 0,
        averageAccuracy: 0,
        bestStreak: 0,
        totalQuestionsAnswered: 0,
        totalCorrectAnswers: 0,
      }
    }

    const totalRuns = chapterRuns.length
    const totalCorrectAnswers = chapterRuns.reduce((sum, run) => sum + run.correctAnswers, 0)
    const totalQuestionsAnswered = chapterRuns.reduce(
      (sum, run) => sum + (run.correctAnswers + run.incorrectAnswers),
      0,
    )
    const averageAccuracy = totalQuestionsAnswered > 0 ? (totalCorrectAnswers / totalQuestionsAnswered) * 100 : 0
    const bestStreak = Math.max(...chapterRuns.map((run) => run.points))

    return {
      totalRuns,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      bestStreak,
      totalQuestionsAnswered,
      totalCorrectAnswers,
    }
  }, [chapterRuns])

  console.warn('[useGameOverData] Historical data:', { pastRuns: pastRuns.length, stats })

  return {
    lastRun,
    pastRuns,
    stats,
  }
}
