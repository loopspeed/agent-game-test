/**
 * Level Manager Service
 *
 * Manages the rhythm-based level generation and coordinates between the
 * RhythmLevelGenerator and the game's obstacle/answer gate systems.
 *
 * Responsibilities:
 * - Generate level segments ahead of time
 * - Queue obstacles and answer gates for spawning
 * - Coordinate timing with game's time system
 * - Handle player performance feedback for difficulty adjustment
 */

import type { Answer, Question } from '@/model/content'

import { ActionType, type LevelSegment, RhythmLevelGenerator, type RhythmNote } from './RhythmLevelGenerator'

export type ObstacleSpawnData = {
  id: string
  type: 'sphere' | 'beam'
  lanes: number[] // Which lanes to spawn obstacles in
  spawnTime: number // Game time when obstacle should spawn
  speed: number
  metadata?: {
    actionType: ActionType
    isForced: boolean // Whether this obstacle forces a specific action
  }
}

export type AnswerGateSpawnData = {
  id: string
  question: Question
  answerMapping: (Answer | null)[] // Answer mapping for 3x3 grid
  spawnTime: number
  speed: number
  runUpDuration: number
  actionDuration: number
}

export type LevelEvent = {
  id: string
  type: 'obstacle' | 'answerGate' | 'rest'
  spawnTime: number
  data: ObstacleSpawnData | AnswerGateSpawnData
}

export class LevelManager {
  private generator: RhythmLevelGenerator
  private segments: LevelSegment[] = []
  private eventQueue: LevelEvent[] = []
  private currentGameTime = 0
  private segmentLookahead = 3 // Generate 3 segments ahead
  private baseObstacleSpeed = 12.0
  private baseAnswerGateSpeed = 5.5

  constructor(questions: Question[]) {
    this.generator = new RhythmLevelGenerator(questions)
    this.preGenerateSegments()
  }

  /**
   * Updates the level manager with current game time and returns events to spawn
   */
  update(gameTime: number): LevelEvent[] {
    this.currentGameTime = gameTime

    // Generate more segments if needed
    this.ensureSegmentBuffer()

    // Get events that should spawn now
    const eventsToSpawn = this.getEventsToSpawn(gameTime)

    // Remove spawned events from queue
    this.eventQueue = this.eventQueue.filter((event) => event.spawnTime > gameTime)

    return eventsToSpawn
  }

  /**
   * Pre-generates initial segments and populates event queue
   */
  private preGenerateSegments(): void {
    for (let i = 0; i < this.segmentLookahead; i++) {
      const segment = this.generator.generateNextSegment()
      this.segments.push(segment)
      this.processSegmentIntoEvents(segment)
    }
  }

  /**
   * Ensures we always have enough segments generated ahead
   */
  private ensureSegmentBuffer(): void {
    // Remove old segments that are behind current time
    this.segments = this.segments.filter((segment) => segment.endTime > this.currentGameTime - 10)

    // Generate new segments if buffer is low
    while (this.segments.length < this.segmentLookahead) {
      const segment = this.generator.generateNextSegment()
      this.segments.push(segment)
      this.processSegmentIntoEvents(segment)
    }
  }

  /**
   * Converts a level segment into spawnable events
   */
  private processSegmentIntoEvents(segment: LevelSegment): void {
    for (const note of segment.notes) {
      if (note.actionType === ActionType.ANSWER_GATE) {
        this.createAnswerGateEvent(note)
      } else if (note.actionType !== ActionType.REST) {
        this.createObstacleEvent(note)
      }
      // REST actions don't create events (they're empty space)
    }
  }

  /**
   * Creates an answer gate spawn event from a rhythm note
   */
  private createAnswerGateEvent(note: RhythmNote): void {
    if (!note.question || !note.answerMapping) return

    const spawnData: AnswerGateSpawnData = {
      id: note.id,
      question: note.question,
      answerMapping: note.answerMapping,
      spawnTime: note.startTime,
      speed: this.baseAnswerGateSpeed,
      runUpDuration: note.runUpDuration,
      actionDuration: note.actionDuration,
    }

    const event: LevelEvent = {
      id: note.id,
      type: 'answerGate',
      spawnTime: note.startTime,
      data: spawnData,
    }

    this.eventQueue.push(event)
  }

  /**
   * Creates obstacle spawn events from a rhythm note
   */
  private createObstacleEvent(note: RhythmNote): void {
    if (note.obstacleLanes.length === 0) return

    // Determine obstacle type based on action
    const obstacleType = this.getObstacleTypeForAction(note.actionType)

    const spawnData: ObstacleSpawnData = {
      id: note.id,
      type: obstacleType,
      lanes: note.obstacleLanes,
      spawnTime: note.startTime,
      speed: this.baseObstacleSpeed,
      metadata: {
        actionType: note.actionType,
        isForced: true, // All rhythm-generated obstacles force specific actions
      },
    }

    const event: LevelEvent = {
      id: note.id,
      type: 'obstacle',
      spawnTime: note.startTime,
      data: spawnData,
    }

    this.eventQueue.push(event)
  }

  /**
   * Maps action types to obstacle types
   */
  private getObstacleTypeForAction(actionType: ActionType): 'sphere' | 'beam' {
    switch (actionType) {
      case ActionType.MOVE_DOWN:
        return 'beam' // Beam obstacles for vertical movement down
      case ActionType.MOVE_UP:
      case ActionType.LANE_CHANGE_LEFT:
      case ActionType.LANE_CHANGE_RIGHT:
      default:
        return 'sphere' // Sphere obstacles for other actions
    }
  }

  /**
   * Gets events that should spawn at the current game time
   */
  private getEventsToSpawn(gameTime: number): LevelEvent[] {
    return this.eventQueue.filter((event) => event.spawnTime <= gameTime && event.spawnTime > gameTime - 0.1)
  }

  /**
   * Provides feedback on player performance to adjust difficulty
   */
  onPlayerPerformance(performance: {
    correctAnswers: number
    incorrectAnswers: number
    obstacleHits: number
    currentStreak: number
  }): void {
    // This could be used to adjust the generator's difficulty in real-time
    // For now, the generator handles its own difficulty progression
    // Avoiding console.debug due to linting rules
    void performance // Mark as used
  }

  /**
   * Gets the current active segment for debugging
   */
  getCurrentSegment(): LevelSegment | null {
    return (
      this.segments.find(
        (segment) => segment.startTime <= this.currentGameTime && segment.endTime > this.currentGameTime,
      ) || null
    )
  }

  /**
   * Gets upcoming events for UI preview
   */
  getUpcomingEvents(lookAheadTime: number = 5.0): LevelEvent[] {
    return this.eventQueue.filter(
      (event) => event.spawnTime > this.currentGameTime && event.spawnTime <= this.currentGameTime + lookAheadTime,
    )
  }

  /**
   * Resets the level manager state
   */
  reset(): void {
    this.generator.reset()
    this.segments = []
    this.eventQueue = []
    this.currentGameTime = 0
    this.preGenerateSegments()
  }

  /**
   * Gets debug information about the level manager state
   */
  getDebugInfo() {
    const currentSegment = this.getCurrentSegment()
    const upcomingEvents = this.getUpcomingEvents(10)

    return {
      currentGameTime: this.currentGameTime,
      segmentsGenerated: this.segments.length,
      eventsQueued: this.eventQueue.length,
      currentSegment: currentSegment
        ? {
            id: currentSegment.id,
            type: currentSegment.segmentType,
            difficulty: `${currentSegment.actualDifficulty}/${currentSegment.difficultyBudget}`,
            notesCount: currentSegment.notes.length,
          }
        : null,
      upcomingEvents: upcomingEvents.map((event) => ({
        id: event.id,
        type: event.type,
        spawnTime: event.spawnTime,
        timeUntilSpawn: event.spawnTime - this.currentGameTime,
      })),
      generatorState: this.generator.getState(),
    }
  }
}
