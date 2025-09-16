import { useMemo } from 'react'

import { type AnswerHit } from '@/model/game'
import { POINTS_ANSWER_CORRECT, POINTS_ANSWER_INCORRECT, type ScoreEvent, useLevelStore } from '@/stores/LevelProvider'

export type UnifiedScoreEvent = {
  id: string // Unique identifier used for React keys
  points: number // Positive or negative score
  timestamp: number // When the event occurred
}

/**
 * Combines obstacle score events and answer-hit events into a unified array.
 * The array is kept sorted by timestamp so popups appear in chronological order.
 */
export const useScoreEvents = () => {
  const scoreEvents = useLevelStore((s) => s.scoreEvents)
  const answersHit = useLevelStore((s) => s.answersHit)

  const unifiedEvents = useMemo<UnifiedScoreEvent[]>(() => {
    const events: UnifiedScoreEvent[] = []

    // Convert obstacle ScoreEvent objects to unified events
    scoreEvents.forEach((ev: ScoreEvent) => {
      events.push({
        id: `${ev.obstacleId}-${ev.timestamp}`,
        points: ev.points,
        timestamp: ev.timestamp,
      })
    })

    // Convert AnswerHit objects to unified events with point values
    answersHit.forEach((hit: AnswerHit) => {
      const points = hit.isCorrect ? POINTS_ANSWER_CORRECT : POINTS_ANSWER_INCORRECT
      events.push({
        id: `${hit.questionId}-${hit.timestamp}`,
        points,
        timestamp: hit.timestamp,
      })
    })

    // Sort so the earliest events are first
    events.sort((a, b) => a.timestamp - b.timestamp)
    console.log('[useScoreEvents] unifiedEvents:', events)
    return events
  }, [scoreEvents, answersHit])

  // Provide the most recent event if needed
  const latestScore = unifiedEvents.length > 0 ? unifiedEvents[unifiedEvents.length - 1] : null

  return { scoreEvents: unifiedEvents, latestScore }
}
