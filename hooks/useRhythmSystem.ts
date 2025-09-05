/**
 * useRhythmSystem Hook
 *
 * React hook that integrates the rhythm-based level generation with the game state.
 * Provides obstacle and answer gate data that replaces the old random spawning system.
 */

import { useEffect, useRef } from 'react'

import type { Question, Answer } from '@/model/content'
import { GameStage, useGameStore } from '@/stores/GameProvider'
import {
  RhythmService,
  type SpawnEvent,
  type ObstacleSpawnData,
  type AnswerGateSpawnData,
} from '@/services/RhythmService'

export type RhythmSystemConfig = {
  questions: Question[]
  enabled?: boolean
}

export type RhythmObstacleData = {
  id: string
  type: 'sphere' | 'beam'
  lanes: number[]
  shouldSpawn: boolean
  spawnTime: number
  actionType: string
}

export type RhythmAnswerGateData = {
  id: string
  question: Question
  answerMapping: (Answer | null)[]
  shouldSpawn: boolean
  spawnTime: number
  runUpDuration: number
}

export function useRhythmSystem(config: RhythmSystemConfig) {
  const rhythmService = useRef<RhythmService | null>(null)
  const gameTime = useRef(0)
  const lastSpawnEvents = useRef<SpawnEvent[]>([])

  // Game state
  const stage = useGameStore((s) => s.stage)
  const isPlaying = stage === GameStage.PLAYING

  // Performance tracking for feedback
  const answersHit = useGameStore((s) => s.answersHit)
  const currentStreak = useGameStore((s) => s.currentStreak)

  // Initialize rhythm service
  useEffect(() => {
    if (config.enabled !== false) {
      rhythmService.current = new RhythmService({
        questions: config.questions,
      })
    }
  }, [config.questions, config.enabled])

  // Start/stop rhythm system based on game state
  useEffect(() => {
    if (!rhythmService.current) return

    if (isPlaying) {
      rhythmService.current.start()
    } else {
      rhythmService.current.stop()
    }
  }, [isPlaying])

  // Reset when game restarts
  useEffect(() => {
    if (!rhythmService.current) return

    if (stage === GameStage.INTRO) {
      rhythmService.current.reset()
      gameTime.current = 0
      lastSpawnEvents.current = []
    }
  }, [stage])

  /**
   * Updates the rhythm system with current game time
   * Should be called every frame
   */
  const updateRhythmSystem = (currentGameTime: number): void => {
    if (!rhythmService.current || !isPlaying) return

    gameTime.current = currentGameTime
    lastSpawnEvents.current = rhythmService.current.update(currentGameTime)

    // Report player performance periodically
    if (Math.floor(currentGameTime) % 5 === 0) {
      // Every 5 seconds
      const correctAnswers = answersHit.filter((hit) => hit.isCorrect).length
      const incorrectAnswers = answersHit.length - correctAnswers

      rhythmService.current.reportPlayerPerformance({
        correctAnswers,
        incorrectAnswers,
        obstacleHits: 0, // Would need to track this separately
        currentStreak,
      })
    }
  }

  /**
   * Gets obstacles that should be spawned this frame
   */
  const getObstaclesToSpawn = (): RhythmObstacleData[] => {
    return lastSpawnEvents.current
      .filter((event) => event.type === 'obstacle')
      .map((event) => {
        const data = event.data as ObstacleSpawnData
        return {
          id: data.id,
          type: data.type,
          lanes: data.lanes,
          shouldSpawn: true,
          spawnTime: data.spawnTime,
          actionType: data.metadata?.actionType || 'unknown',
        }
      })
  }

  /**
   * Gets answer gates that should be spawned this frame
   */
  const getAnswerGatesToSpawn = (): RhythmAnswerGateData[] => {
    return lastSpawnEvents.current
      .filter((event) => event.type === 'answerGate')
      .map((event) => {
        const data = event.data as AnswerGateSpawnData
        return {
          id: data.id,
          question: data.question,
          answerMapping: data.answerMapping,
          shouldSpawn: true,
          spawnTime: data.spawnTime,
          runUpDuration: data.runUpDuration,
        }
      })
  }

  /**
   * Gets the next answer gate for UI preparation
   */
  const getNextAnswerGate = (): RhythmAnswerGateData | null => {
    if (!rhythmService.current) return null

    const nextGate = rhythmService.current.getNextAnswerGate()
    if (!nextGate) return null

    return {
      id: nextGate.id,
      question: nextGate.question,
      answerMapping: nextGate.answerMapping,
      shouldSpawn: false,
      spawnTime: nextGate.spawnTime,
      runUpDuration: nextGate.runUpDuration,
    }
  }

  /**
   * Gets debug information about the rhythm system
   */
  const getDebugInfo = () => {
    if (!rhythmService.current) return null
    return rhythmService.current.getDebugInfo()
  }

  /**
   * Checks if rhythm-based spawning is active
   */
  const isRhythmActive = (): boolean => {
    return rhythmService.current !== null && isPlaying
  }

  return {
    updateRhythmSystem,
    getObstaclesToSpawn,
    getAnswerGatesToSpawn,
    getNextAnswerGate,
    getDebugInfo,
    isRhythmActive,
  }
}
