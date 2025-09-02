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
  const courseSummary = useGameStore((state) => state.courseSummary)
  const gameStartTime = useGameStore((state) => state.gameStartTime)
  const health = useGameStore((state) => state.health)
  const currentQuestionIndex = useGameStore((state) => state.currentQuestionIndex)
  const questions = useGameStore((state) => state.questions)
  const courseId = useGameStore((state) => state.courseId)

  const { getCourseRuns, getStats } = useHistoryStore()

  // Calculate current run stats
  const correctAnswers = courseSummary.answersHit.filter((hit) => hit.isCorrect).length
  const incorrectAnswers = courseSummary.answersHit.filter((hit) => !hit.isCorrect).length
  const totalAnswered = correctAnswers + incorrectAnswers
  const accuracyPercentage = totalAnswered > 0 ? (correctAnswers / totalAnswered) * 100 : 0
  const completionTime = Date.now() - gameStartTime

  const currentRun = {
    answersHit: courseSummary.answersHit,
    maxStreak: courseSummary.maxStreak,
    correctAnswers,
    incorrectAnswers,
    accuracyPercentage: Math.round(accuracyPercentage * 100) / 100,
    questionsCompleted: currentQuestionIndex,
    totalQuestions: questions.length,
    finalHealth: health,
    completionTime,
  }

  // Get historical data
  const pastRuns = getCourseRuns(courseId)
  const stats = getStats()

  return {
    currentRun,
    pastRuns,
    stats,
  }
}
