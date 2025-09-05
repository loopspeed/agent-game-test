/**
 * RhythmDebugDisplay Component
 *
 * Displays real-time information about the rhythm system for debugging and demonstration.
 * Shows current segment, upcoming events, and system state.
 */

'use client'

import { type FC } from 'react'

import { useRhythmSystem } from '@/hooks/useRhythmSystem'
import { useGameStore, GameStage } from '@/stores/GameProvider'

const RhythmDebugDisplay: FC = () => {
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const questions = useGameStore((s) => s.questions)

  const { getDebugInfo, getNextAnswerGate, isRhythmActive } = useRhythmSystem({
    questions,
    enabled: true,
  })

  if (!isPlaying || !isRhythmActive()) {
    return (
      <div className="fixed top-4 right-4 rounded-lg bg-black/80 p-4 text-sm text-white">
        <h3 className="font-bold text-yellow-400">Rhythm System</h3>
        <p>Inactive</p>
      </div>
    )
  }

  const debugInfo = getDebugInfo()
  const nextAnswerGate = getNextAnswerGate()

  return (
    <div className="fixed top-4 right-4 max-w-md rounded-lg bg-black/80 p-4 text-sm text-white">
      <h3 className="mb-2 font-bold text-green-400">🎵 Rhythm System Active</h3>

      {/* Current Segment */}
      {debugInfo?.levelManager.currentSegment && (
        <div className="mb-3">
          <h4 className="font-semibold text-blue-300">Current Segment</h4>
          <div className="ml-2 text-xs">
            <p>
              Type: <span className="text-yellow-300">{debugInfo.levelManager.currentSegment.type}</span>
            </p>
            <p>
              Difficulty: <span className="text-red-300">{debugInfo.levelManager.currentSegment.difficulty}</span>
            </p>
            <p>Notes: {debugInfo.levelManager.currentSegment.notesCount}</p>
          </div>
        </div>
      )}

      {/* Generator State */}
      {debugInfo?.levelManager.generatorState && (
        <div className="mb-3">
          <h4 className="font-semibold text-blue-300">Generator</h4>
          <div className="ml-2 text-xs">
            <p>Time: {Math.round(debugInfo.levelManager.generatorState.currentTime)}s</p>
            <p>Difficulty Budget: {debugInfo.levelManager.generatorState.currentDifficultyBudget.toFixed(1)}</p>
            <p>Player Lane: {debugInfo.levelManager.generatorState.currentPlayerLane}</p>
            <p>Next Answer Gate: {Math.round(debugInfo.levelManager.generatorState.nextAnswerGateTime)}s</p>
          </div>
        </div>
      )}

      {/* Next Answer Gate */}
      {nextAnswerGate && (
        <div className="mb-3">
          <h4 className="font-semibold text-purple-300">Next Answer Gate</h4>
          <div className="ml-2 text-xs">
            <p>Question: {nextAnswerGate.question.question.substring(0, 40)}...</p>
            <p>Spawn Time: {Math.round(nextAnswerGate.spawnTime)}s</p>
            <p>Run-up: {nextAnswerGate.runUpDuration}s</p>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {debugInfo?.levelManager.upcomingEvents && debugInfo.levelManager.upcomingEvents.length > 0 && (
        <div className="mb-3">
          <h4 className="font-semibold text-orange-300">Upcoming Events</h4>
          <div className="ml-2 space-y-1 text-xs">
            {debugInfo.levelManager.upcomingEvents
              .slice(0, 3)
              .map((event: { id: string; type: string; timeUntilSpawn: number }, index: number) => (
                <div key={event.id} className="border-l-2 border-orange-400 pl-2">
                  <p>
                    #{index + 1}: {event.type}
                  </p>
                  <p>In: {Math.round(event.timeUntilSpawn)}s</p>
                </div>
              ))}
            {debugInfo.levelManager.upcomingEvents.length > 3 && (
              <p className="text-gray-400">...and {debugInfo.levelManager.upcomingEvents.length - 3} more</p>
            )}
          </div>
        </div>
      )}

      {/* System Stats */}
      <div className="border-t border-gray-600 pt-2 text-xs text-gray-300">
        <p>Segments: {debugInfo?.levelManager.segmentsGenerated}</p>
        <p>Events Queued: {debugInfo?.levelManager.eventsQueued}</p>
      </div>
    </div>
  )
}

export default RhythmDebugDisplay
