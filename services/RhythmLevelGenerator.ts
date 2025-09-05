/**
 * Rhythm-based Level Generation Service
 *
 * Implements Jan Kočur's rhythm-based approach to endless runner level generation.
 * Treats player actions (lane changes, jumps, ducks) and answer gates as musical "beats"
 * in a structured rhythm with run-up, action, and recovery phases.
 *
 * Key concepts:
 * - Actions are discrete player moves forced by obstacle placement
 * - Each action has run-up time (preparation) and recovery time (cooldown)
 * - Answer gates are special actions with their own rhythm slots
 * - Level segments follow verse-chorus structure with pattern variation
 * - Difficulty budgeting prevents overwhelming complexity
 * - Solution-first generation ensures playable paths
 */

import type { Answer, Question } from '@/model/content'

// ========== CORE TYPES ==========

export enum ActionType {
  LANE_CHANGE_LEFT = 'LANE_CHANGE_LEFT',
  LANE_CHANGE_RIGHT = 'LANE_CHANGE_RIGHT',
  MOVE_UP = 'MOVE_UP',
  MOVE_DOWN = 'MOVE_DOWN',
  ANSWER_GATE = 'ANSWER_GATE',
  REST = 'REST', // Breathing room between actions
}

export type RhythmNote = {
  id: string
  actionType: ActionType
  startTime: number // Game time in seconds when action begins
  runUpDuration: number // Time before obstacle appears (player preparation)
  actionDuration: number // Time window for performing the action
  recoveryDuration: number // Cooldown time after action
  difficultyWeight: number // Cost towards difficulty budget

  // Spatial data for obstacle placement
  targetLanes: number[] // Which lanes player should be in/avoid
  obstacleLanes: number[] // Which lanes to place obstacles in

  // Answer gate specific data
  question?: Question
  answerMapping?: (Answer | null)[] // 9-slot grid mapping
}

export type LevelSegment = {
  id: string
  startTime: number
  endTime: number
  notes: RhythmNote[]
  segmentType: 'verse' | 'chorus' | 'bridge' | 'rest'
  difficultyBudget: number
  actualDifficulty: number
}

export type ActionDefinition = {
  actionType: ActionType
  baseDifficultyWeight: number
  minRunUpDuration: number
  maxRunUpDuration: number
  actionDuration: number
  recoveryDuration: number

  // Constraints for when this action can appear
  canFollowActions: ActionType[]
  cannotFollowActions: ActionType[]
  minTimeBetweenSame: number // Minimum time before same action can repeat

  // Generator function for obstacle placement
  generateObstaclePlacement: (
    currentPlayerLane: number,
    gridSize: { x: number; y: number },
  ) => {
    targetLanes: number[]
    obstacleLanes: number[]
  }
}

// ========== ACTION DEFINITIONS ==========

const GRID_SIZE = { x: 3, y: 3 } // 3x3 lane grid

/**
 * Converts 2D grid position to 1D lane index
 */
const getLaneIndex = (x: number, y: number): number => y * GRID_SIZE.x + x

/**
 * Converts 1D lane index to 2D grid position
 */
const getGridPosition = (laneIndex: number): { x: number; y: number } => ({
  x: laneIndex % GRID_SIZE.x,
  y: Math.floor(laneIndex / GRID_SIZE.x),
})

export const ACTION_DEFINITIONS: Record<ActionType, ActionDefinition> = {
  [ActionType.LANE_CHANGE_LEFT]: {
    actionType: ActionType.LANE_CHANGE_LEFT,
    baseDifficultyWeight: 1,
    minRunUpDuration: 1.0,
    maxRunUpDuration: 2.0,
    actionDuration: 0.8,
    recoveryDuration: 0.5,
    canFollowActions: [ActionType.REST, ActionType.MOVE_UP, ActionType.MOVE_DOWN],
    cannotFollowActions: [ActionType.LANE_CHANGE_LEFT], // No consecutive left moves
    minTimeBetweenSame: 2.0,
    generateObstaclePlacement: (currentPlayerLane: number) => {
      const currentPos = getGridPosition(currentPlayerLane)
      const targetX = Math.max(0, currentPos.x - 1) // Move left, clamped to grid
      const targetLane = getLaneIndex(targetX, currentPos.y)

      // Block current lane to force movement
      return {
        targetLanes: [targetLane],
        obstacleLanes: [currentPlayerLane],
      }
    },
  },

  [ActionType.LANE_CHANGE_RIGHT]: {
    actionType: ActionType.LANE_CHANGE_RIGHT,
    baseDifficultyWeight: 1,
    minRunUpDuration: 1.0,
    maxRunUpDuration: 2.0,
    actionDuration: 0.8,
    recoveryDuration: 0.5,
    canFollowActions: [ActionType.REST, ActionType.MOVE_UP, ActionType.MOVE_DOWN],
    cannotFollowActions: [ActionType.LANE_CHANGE_RIGHT],
    minTimeBetweenSame: 2.0,
    generateObstaclePlacement: (currentPlayerLane: number) => {
      const currentPos = getGridPosition(currentPlayerLane)
      const targetX = Math.min(GRID_SIZE.x - 1, currentPos.x + 1) // Move right, clamped to grid
      const targetLane = getLaneIndex(targetX, currentPos.y)

      return {
        targetLanes: [targetLane],
        obstacleLanes: [currentPlayerLane],
      }
    },
  },

  [ActionType.MOVE_UP]: {
    actionType: ActionType.MOVE_UP,
    baseDifficultyWeight: 2,
    minRunUpDuration: 1.2,
    maxRunUpDuration: 2.5,
    actionDuration: 1.0,
    recoveryDuration: 0.8,
    canFollowActions: [ActionType.REST, ActionType.LANE_CHANGE_LEFT, ActionType.LANE_CHANGE_RIGHT],
    cannotFollowActions: [ActionType.MOVE_DOWN], // Up and down are opposite actions
    minTimeBetweenSame: 3.0,
    generateObstaclePlacement: (currentPlayerLane: number) => {
      const currentPos = getGridPosition(currentPlayerLane)

      // Force player to move up by blocking current and lower rows
      const obstacleLanes = []
      for (let y = currentPos.y; y < GRID_SIZE.y; y++) {
        for (let x = 0; x < GRID_SIZE.x; x++) {
          obstacleLanes.push(getLaneIndex(x, y))
        }
      }

      // Target lane is one row up (if possible)
      const targetY = Math.max(0, currentPos.y - 1)
      const targetLane = getLaneIndex(currentPos.x, targetY)

      return {
        targetLanes: [targetLane],
        obstacleLanes,
      }
    },
  },

  [ActionType.MOVE_DOWN]: {
    actionType: ActionType.MOVE_DOWN,
    baseDifficultyWeight: 2,
    minRunUpDuration: 1.0,
    maxRunUpDuration: 2.0,
    actionDuration: 0.8,
    recoveryDuration: 0.6,
    canFollowActions: [ActionType.REST, ActionType.LANE_CHANGE_LEFT, ActionType.LANE_CHANGE_RIGHT],
    cannotFollowActions: [ActionType.MOVE_UP],
    minTimeBetweenSame: 3.0,
    generateObstaclePlacement: (currentPlayerLane: number) => {
      const currentPos = getGridPosition(currentPlayerLane)

      // Force player to move down by blocking current and upper rows
      const obstacleLanes = []
      for (let y = 0; y <= currentPos.y; y++) {
        for (let x = 0; x < GRID_SIZE.x; x++) {
          obstacleLanes.push(getLaneIndex(x, y))
        }
      }

      // Target lane is one row down (if possible)
      const targetY = Math.min(GRID_SIZE.y - 1, currentPos.y + 1)
      const targetLane = getLaneIndex(currentPos.x, targetY)

      return {
        targetLanes: [targetLane],
        obstacleLanes,
      }
    },
  },

  [ActionType.ANSWER_GATE]: {
    actionType: ActionType.ANSWER_GATE,
    baseDifficultyWeight: 3,
    minRunUpDuration: 2.0,
    maxRunUpDuration: 3.0,
    actionDuration: 2.0, // More time to read and choose answer
    recoveryDuration: 1.5,
    canFollowActions: Object.values(ActionType).filter((t) => t !== ActionType.ANSWER_GATE),
    cannotFollowActions: [ActionType.ANSWER_GATE], // No consecutive answer gates
    minTimeBetweenSame: 15.0, // Answer gates spaced far apart
    generateObstaclePlacement: () => {
      // Answer gates don't generate traditional obstacles
      // They occupy their own space and have special collision handling
      return {
        targetLanes: [], // Any lane is valid for answer selection
        obstacleLanes: [], // No blocking obstacles during answer gates
      }
    },
  },

  [ActionType.REST]: {
    actionType: ActionType.REST,
    baseDifficultyWeight: 0,
    minRunUpDuration: 0,
    maxRunUpDuration: 0,
    actionDuration: 1.5,
    recoveryDuration: 0,
    canFollowActions: Object.values(ActionType),
    cannotFollowActions: [],
    minTimeBetweenSame: 0,
    generateObstaclePlacement: () => ({
      targetLanes: [],
      obstacleLanes: [],
    }),
  },
}

// ========== RHYTHM GENERATOR ==========

export class RhythmLevelGenerator {
  private currentTime = 0
  private currentDifficultyBudget = 5 // Start easy
  private maxDifficultyBudget = 15
  private difficultyRampRate = 0.1 // Increase per segment

  private lastActionTimes = new Map<ActionType, number>()
  private currentPlayerLane = 4 // Start in center lane (index 4 in 3x3 grid)

  private questions: Question[] = []
  private currentQuestionIndex = 0
  private nextAnswerGateTime = 15.0 // First answer gate at 15 seconds

  constructor(questions: Question[]) {
    this.questions = questions
  }

  /**
   * Generates the next level segment based on current rhythm and difficulty
   */
  generateNextSegment(segmentDuration: number = 8.0): LevelSegment {
    const segment: LevelSegment = {
      id: `segment_${this.currentTime}`,
      startTime: this.currentTime,
      endTime: this.currentTime + segmentDuration,
      notes: [],
      segmentType: this.determineSegmentType(),
      difficultyBudget: this.currentDifficultyBudget,
      actualDifficulty: 0,
    }

    // Generate rhythm notes for this segment
    let segmentTime = 0
    while (segmentTime < segmentDuration) {
      const note = this.generateNextNote(this.currentTime + segmentTime, segment)
      if (note) {
        segment.notes.push(note)
        segment.actualDifficulty += note.difficultyWeight

        // Update tracking
        this.lastActionTimes.set(note.actionType, this.currentTime + segmentTime)
        if (note.actionType !== ActionType.REST && note.actionType !== ActionType.ANSWER_GATE) {
          this.updatePlayerLane(note)
        }

        // Move to next note timing
        segmentTime += note.runUpDuration + note.actionDuration + note.recoveryDuration
      } else {
        // If no valid note can be generated, add rest
        segmentTime += 1.0
      }
    }

    // Update global state
    this.currentTime += segmentDuration
    this.updateDifficulty()

    return segment
  }

  /**
   * Determines the type of segment based on patterns and timing
   */
  private determineSegmentType(): 'verse' | 'chorus' | 'bridge' | 'rest' {
    const segmentNumber = Math.floor(this.currentTime / 8) // 8-second segments

    // Every 4th segment is a rest
    if (segmentNumber % 4 === 3) return 'rest'

    // Every 6th segment is a bridge (variation)
    if (segmentNumber % 6 === 5) return 'bridge'

    // Alternate between verse and chorus
    return segmentNumber % 2 === 0 ? 'verse' : 'chorus'
  }

  /**
   * Generates the next rhythm note based on constraints and timing
   */
  private generateNextNote(noteTime: number, segment: LevelSegment): RhythmNote | null {
    // Check if it's time for an answer gate
    if (noteTime >= this.nextAnswerGateTime && this.currentQuestionIndex < this.questions.length) {
      return this.generateAnswerGateNote(noteTime)
    }

    // Filter available actions based on constraints
    const availableActions = this.getAvailableActions(noteTime, segment)

    if (availableActions.length === 0) {
      return null // No valid actions available
    }

    // Weight selection based on segment type and difficulty budget
    const selectedAction = this.selectWeightedAction(availableActions, segment)

    return this.generateActionNote(selectedAction, noteTime)
  }

  /**
   * Generates an answer gate note
   */
  private generateAnswerGateNote(noteTime: number): RhythmNote {
    const question = this.questions[this.currentQuestionIndex]
    const actionDef = ACTION_DEFINITIONS[ActionType.ANSWER_GATE]

    // Generate random answer mapping for the 3x3 grid
    const answerMapping = this.generateAnswerMapping(question.answers)

    const note: RhythmNote = {
      id: `answer_gate_${noteTime}`,
      actionType: ActionType.ANSWER_GATE,
      startTime: noteTime,
      runUpDuration: actionDef.minRunUpDuration,
      actionDuration: actionDef.actionDuration,
      recoveryDuration: actionDef.recoveryDuration,
      difficultyWeight: actionDef.baseDifficultyWeight,
      targetLanes: [],
      obstacleLanes: [],
      question,
      answerMapping,
    }

    // Schedule next answer gate (15-20 seconds later)
    this.nextAnswerGateTime = noteTime + 15 + Math.random() * 5
    this.currentQuestionIndex++

    return note
  }

  /**
   * Generates answer mapping for the 3x3 grid
   */
  private generateAnswerMapping(answers: Answer[]): (Answer | null)[] {
    const mapping = new Array(9).fill(null)

    // Generate shuffled positions for answers
    const availablePositions = Array.from({ length: 9 }, (_, i) => i)
    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]]
    }

    // Place answers in random positions
    answers.forEach((answer, index) => {
      if (index < availablePositions.length) {
        mapping[availablePositions[index]] = answer
      }
    })

    return mapping
  }

  /**
   * Gets actions that can be performed based on current constraints
   */
  private getAvailableActions(noteTime: number, segment: LevelSegment): ActionType[] {
    const availableActions: ActionType[] = []

    for (const actionType of Object.values(ActionType)) {
      if (actionType === ActionType.ANSWER_GATE) continue // Handled separately

      const actionDef = ACTION_DEFINITIONS[actionType]

      // Check difficulty budget
      if (segment.actualDifficulty + actionDef.baseDifficultyWeight > segment.difficultyBudget) {
        continue
      }

      // Check timing constraints
      const lastTime = this.lastActionTimes.get(actionType) || 0
      if (noteTime - lastTime < actionDef.minTimeBetweenSame) {
        continue
      }

      // Check sequence constraints (what can follow the last action)
      const lastAction = this.getLastAction()
      if (lastAction && actionDef.cannotFollowActions.includes(lastAction)) {
        continue
      }
      if (lastAction && actionDef.canFollowActions.length > 0 && !actionDef.canFollowActions.includes(lastAction)) {
        continue
      }

      availableActions.push(actionType)
    }

    return availableActions
  }

  /**
   * Gets the last action that was performed
   */
  private getLastAction(): ActionType | null {
    let lastAction: ActionType | null = null
    let lastTime = 0

    for (const [actionType, time] of this.lastActionTimes.entries()) {
      if (time > lastTime) {
        lastTime = time
        lastAction = actionType
      }
    }

    return lastAction
  }

  /**
   * Selects an action based on weights and segment type
   */
  private selectWeightedAction(availableActions: ActionType[], segment: LevelSegment): ActionType {
    // Adjust weights based on segment type
    const weights = availableActions.map((actionType) => {
      let weight = 1

      switch (segment.segmentType) {
        case 'verse':
          // Favor varied actions in verses
          weight = actionType === ActionType.REST ? 0.3 : 1.0
          break
        case 'chorus':
          // Favor repeated patterns in choruses
          weight = this.lastActionTimes.has(actionType) ? 1.5 : 1.0
          break
        case 'bridge':
          // Favor complex actions in bridges
          weight = ACTION_DEFINITIONS[actionType].baseDifficultyWeight
          break
        case 'rest':
          // Heavily favor rest actions in rest segments
          weight = actionType === ActionType.REST ? 3.0 : 0.2
          break
      }

      return weight
    })

    // Weighted random selection
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < availableActions.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return availableActions[i]
      }
    }

    return availableActions[0] // Fallback
  }

  /**
   * Generates a note for a specific action
   */
  private generateActionNote(actionType: ActionType, noteTime: number): RhythmNote {
    const actionDef = ACTION_DEFINITIONS[actionType]

    // Randomize run-up duration within bounds
    const runUpDuration =
      actionDef.minRunUpDuration + Math.random() * (actionDef.maxRunUpDuration - actionDef.minRunUpDuration)

    // Generate obstacle placement
    const placement = actionDef.generateObstaclePlacement(this.currentPlayerLane, GRID_SIZE)

    return {
      id: `${actionType}_${noteTime}`,
      actionType,
      startTime: noteTime,
      runUpDuration,
      actionDuration: actionDef.actionDuration,
      recoveryDuration: actionDef.recoveryDuration,
      difficultyWeight: actionDef.baseDifficultyWeight,
      targetLanes: placement.targetLanes,
      obstacleLanes: placement.obstacleLanes,
    }
  }

  /**
   * Updates the player's expected lane position after an action
   */
  private updatePlayerLane(note: RhythmNote): void {
    if (note.targetLanes.length > 0) {
      this.currentPlayerLane = note.targetLanes[0]
    }
  }

  /**
   * Updates difficulty for the next segment
   */
  private updateDifficulty(): void {
    this.currentDifficultyBudget = Math.min(
      this.currentDifficultyBudget + this.difficultyRampRate,
      this.maxDifficultyBudget,
    )
  }

  /**
   * Resets the generator state
   */
  reset(): void {
    this.currentTime = 0
    this.currentDifficultyBudget = 5
    this.lastActionTimes.clear()
    this.currentPlayerLane = 4 // Center lane
    this.currentQuestionIndex = 0
    this.nextAnswerGateTime = 15.0
  }

  /**
   * Gets the current generator state
   */
  getState() {
    return {
      currentTime: this.currentTime,
      currentDifficultyBudget: this.currentDifficultyBudget,
      currentPlayerLane: this.currentPlayerLane,
      currentQuestionIndex: this.currentQuestionIndex,
      nextAnswerGateTime: this.nextAnswerGateTime,
    }
  }
}
