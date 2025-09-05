/**
 * Rhythm Service Integration
 *
 * Connects the rhythm-based level generation system with the existing game state and components.
 * Provides a clean interface for the game to use rhythm-based spawning instead of random spawning.
 */

import { LevelManager, type LevelEvent, type ObstacleSpawnData, type AnswerGateSpawnData } from './LevelManager'

import type { Question } from '@/model/content'

export type { ObstacleSpawnData, AnswerGateSpawnData }

export type RhythmServiceConfig = {
  questions: Question[]
  baseObstacleSpeed?: number
  baseAnswerGateSpeed?: number
  segmentDuration?: number
}

export type SpawnEvent = {
  type: 'obstacle' | 'answerGate'
  data: ObstacleSpawnData | AnswerGateSpawnData
}

export class RhythmService {
  private levelManager: LevelManager
  private isActive = false
  private lastUpdateTime = 0

  constructor(config: RhythmServiceConfig) {
    this.levelManager = new LevelManager(config.questions)
  }

  /**
   * Starts the rhythm-based spawning system
   */
  start(): void {
    this.isActive = true
    this.lastUpdateTime = 0
  }

  /**
   * Stops the rhythm-based spawning system
   */
  stop(): void {
    this.isActive = false
  }

  /**
   * Resets the rhythm system to initial state
   */
  reset(): void {
    this.levelManager.reset()
    this.lastUpdateTime = 0
  }

  /**
   * Updates the rhythm system and returns events that should be spawned
   * This should be called every frame with the current game time
   */
  update(gameTime: number): SpawnEvent[] {
    if (!this.isActive) return []

    const levelEvents = this.levelManager.update(gameTime)
    // Filter out rest events since they don't spawn anything
    return levelEvents.filter((event) => event.type !== 'rest').map(this.convertLevelEventToSpawnEvent)
  }

  /**
   * Converts internal level events to external spawn events
   */
  private convertLevelEventToSpawnEvent(levelEvent: LevelEvent): SpawnEvent {
    return {
      type: levelEvent.type as 'obstacle' | 'answerGate', // Safe cast since we filtered out 'rest'
      data: levelEvent.data,
    }
  }

  /**
   * Provides feedback on player performance for difficulty adjustment
   */
  reportPlayerPerformance(performance: {
    correctAnswers: number
    incorrectAnswers: number
    obstacleHits: number
    currentStreak: number
  }): void {
    this.levelManager.onPlayerPerformance(performance)
  }

  /**
   * Gets the next answer gate event for UI preparation
   */
  getNextAnswerGate(): AnswerGateSpawnData | null {
    const upcomingEvents = this.levelManager.getUpcomingEvents(20) // Look 20 seconds ahead
    const nextAnswerGate = upcomingEvents.find((event) => event.type === 'answerGate')

    if (nextAnswerGate && nextAnswerGate.type === 'answerGate') {
      return nextAnswerGate.data as AnswerGateSpawnData
    }

    return null
  }

  /**
   * Gets upcoming obstacle events for preview
   */
  getUpcomingObstacles(lookAheadTime: number = 5): ObstacleSpawnData[] {
    const upcomingEvents = this.levelManager.getUpcomingEvents(lookAheadTime)
    return upcomingEvents.filter((event) => event.type === 'obstacle').map((event) => event.data as ObstacleSpawnData)
  }

  /**
   * Gets debug information about the rhythm system
   */
  getDebugInfo() {
    return {
      isActive: this.isActive,
      lastUpdateTime: this.lastUpdateTime,
      levelManager: this.levelManager.getDebugInfo(),
    }
  }

  /**
   * Checks if the system is ready to provide answer gate data
   */
  isReadyForAnswerGates(): boolean {
    return this.isActive && this.getNextAnswerGate() !== null
  }
}
