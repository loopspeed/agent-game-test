import type { Answer, Question } from '@/model/content'

/**
 * An event in the generated course timeline.  A course is defined as a
 * sequence of events ordered along the Z‑axis.  Obstacles and gates will
 * move towards the player along the +Z direction.  The z coordinate is
 * negative at spawn time and increases towards zero as the player
 * approaches.  Gate events carry an answer id and a question index so
 * that the game can evaluate responses, while obstacle events carry a
 * movement speed.
 */
export type CourseEventType = 'obstacle' | 'gate'

export interface CourseEvent {
  /**
   * The type of event.  Obstacles require the player to avoid or
   * interact, while gates represent answer choices for a question.
   */
  type: CourseEventType
  /**
   * Index of the lane in a 3×3 grid (0–8).  Lanes are numbered left to
   * right, top to bottom:
   *
   * 0 1 2
   * 3 4 5
   * 6 7 8
   */
  lane: number
  /**
   * Position along the Z‑axis where the event is spawned.  Negative
   * values represent positions in front of the player; events with
   * lower z values spawn earlier in the run.
   */
  z: number
  /**
   * Optional movement speed of the obstacle.  Only defined for
   * obstacle events.
   */
  speed?: number
  /**
   * Index of the question this gate belongs to.  Only defined for
   * gate events.
   */
  questionIndex?: number
  /**
   * Identifier of the answer that this gate represents.  Undefined
   * for non‑answer lanes.
   */
  answerId?: string | null
}

export interface Course {
  /**
   * Sorted array of events representing the entire course timeline.  The
   * array is sorted by z coordinate ascending (from most negative to
   * least negative), so events earlier in the run appear first.
   */
  events: CourseEvent[]
}

/**
 * Options influencing course generation.  All distances are expressed in
 * world units (metres) along the Z‑axis.
 */
export interface CourseOptions {
  /**
   * Z position where the first set of gates and obstacles spawns.  This
   * should match the spawn position used by the game (e.g. -30 by
   * default).
   */
  startZ?: number
  /**
   * Distance between consecutive questions (and their gate clusters).
   * Must be greater than the sum of pre‑ and post‑obstacle runup
   * distances to avoid overlap between segments.
   */
  gateSpacing?: number
  /**
   * Number of obstacles to spawn before each answer gate.
   */
  preObstacleCount?: number
  /**
   * Number of obstacles to spawn after each answer gate.
   */
  postObstacleCount?: number
  /**
   * Distance between consecutive pre‑obstacles (runup spacing).
   */
  runupSpacing?: number
  /**
   * Distance between consecutive post‑obstacles (recovery spacing).
   */
  recoverySpacing?: number
  /**
   * Base speed assigned to all obstacles.  The actual speed is
   * baseSpeed ± obstacleSpeedVariation.
   */
  baseObstacleSpeed?: number
  /**
   * Maximum variation applied to the base obstacle speed.  The final
   * speed of each obstacle will be
   * baseObstacleSpeed + random(-variation, variation).
   */
  obstacleSpeedVariation?: number
  /**
   * Whether to enforce that the player’s path lane changes between
   * consecutive questions.  When true, the algorithm will avoid
   * selecting the same path lane twice in a row, encouraging lane
   * changes.
   */
  ensureUniquePath?: boolean
}

/**
 * Generates a course timeline for a set of questions.  The course is
 * composed of obstacle events and gate events.  Obstacles are placed
 * before and after each answer gate using simple spacing rules, and
 * answer gates are placed evenly along the Z‑axis according to
 * `gateSpacing`.
 *
 * Lanes for gates are chosen using a Fisher‑Yates shuffle to ensure
 * randomness.  Lanes for obstacles are chosen randomly from all lanes
 * except the current path lane; the path lane is selected randomly
 * per question and may optionally be forced to change between
 * questions.
 *
 * @param questions List of questions that define where gates appear.
 * @param opts Optional settings controlling spacing and speeds.
 * @returns A complete course timeline sorted by z coordinate.
 */
export function generateCourse(questions: Question[], opts: CourseOptions = {}): Course {
  // Default configuration values
  const startZ = opts.startZ ?? -30
  const gateSpacing = opts.gateSpacing ?? 20
  const preObstacleCount = opts.preObstacleCount ?? 2
  const postObstacleCount = opts.postObstacleCount ?? 2
  const runupSpacing = opts.runupSpacing ?? 4
  const recoverySpacing = opts.recoverySpacing ?? 4
  const baseObstacleSpeed = opts.baseObstacleSpeed ?? 5
  const obstacleSpeedVariation = opts.obstacleSpeedVariation ?? 2
  const ensureUniquePath = opts.ensureUniquePath ?? false

  const events: CourseEvent[] = []
  // Select an initial path lane at random.  The path lane is the
  // lane that remains clear of obstacles for a given question segment.
  let currentPathLane = Math.floor(Math.random() * 9)

  for (let qi = 0; qi < questions.length; qi++) {
    const question = questions[qi]
    // Determine the Z position of the gates for this question.
    const gateZ = startZ - qi * gateSpacing

    // Optionally choose a new path lane to encourage lane changes.
    if (ensureUniquePath) {
      let nextLane: number
      do {
        nextLane = Math.floor(Math.random() * 9)
      } while (nextLane === currentPathLane)
      currentPathLane = nextLane
    } else {
      // Randomly pick a path lane for each question
      currentPathLane = Math.floor(Math.random() * 9)
    }

    // Generate answer gate mapping for this question.  Each answer is
    // assigned to a random lane position.  Unused lanes get null.
    const answerMapping = mapAnswersToGatePositionsForQuestion(question)

    // Create gate events for each lane.  If the lane contains an
    // answer, record its ID; otherwise, answerId is null.
    answerMapping.forEach((answer, lane) => {
      events.push({
        type: 'gate',
        lane,
        z: gateZ,
        questionIndex: qi,
        // answer may be null for unused lanes
        answerId: answer?.id ?? null,
      })
    })

    // Generate obstacles before the gate.  Place them at evenly
    // spaced positions decreasing away from the gate.  Skip the
    // current path lane to ensure passability.
    for (let i = 0; i < preObstacleCount; i++) {
      const zPos = gateZ - runupSpacing * (preObstacleCount - i)
      // Choose a random lane that is not the path lane.
      const possibleLanes = lanesExcluding(currentPathLane)
      const lane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)]
      events.push({
        type: 'obstacle',
        lane,
        z: zPos,
        speed: randomSpeed(baseObstacleSpeed, obstacleSpeedVariation),
      })
    }

    // Generate obstacles after the gate.  These are placed at
    // increasing distances ahead of the gate.  Again avoid the path
    // lane.
    for (let i = 0; i < postObstacleCount; i++) {
      const zPos = gateZ + recoverySpacing * (i + 1)
      const possibleLanes = lanesExcluding(currentPathLane)
      const lane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)]
      events.push({
        type: 'obstacle',
        lane,
        z: zPos,
        speed: randomSpeed(baseObstacleSpeed, obstacleSpeedVariation),
      })
    }
  }

  // Sort events by their z coordinate to ensure proper spawning order.
  events.sort((a, b) => a.z - b.z)

  return { events }
}

/**
 * Generates an answer mapping for a single question.  Assigns each
 * answer to a random lane in a 3×3 grid using a Fisher‑Yates shuffle.
 * Lanes that are not used to host an answer remain null.
 */
function mapAnswersToGatePositionsForQuestion(question: Question): (Answer | null)[] {
  const { answers } = question
  // Initialise a 9‑cell grid with nulls.
  const answerMapping: (Answer | null)[] = new Array(9).fill(null)
  // Create an array of all possible lane indices (0..8)
  const availablePositions = Array.from({ length: 9 }, (_, i) => i)
  // Shuffle the positions using Fisher–Yates
  for (let i = availablePositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]]
  }
  // Take only as many positions as there are answers
  const selectedPositions = availablePositions.slice(0, answers.length)
  // Assign each answer to a random position
  answers.forEach((answer, index) => {
    answerMapping[selectedPositions[index]] = answer
  })
  return answerMapping
}

/**
 * Returns an array of all lane indices (0..8) except the one passed
 * in.  Used to pick a lane for obstacles while keeping the path lane
 * clear.
 */
function lanesExcluding(exclude: number): number[] {
  const lanes: number[] = []
  for (let i = 0; i < 9; i++) {
    if (i !== exclude) lanes.push(i)
  }
  return lanes
}

/**
 * Generates a random speed around a base value.  The returned speed is
 * base ± variation.  If variation is zero, the base speed is
 * returned unchanged.
 */
function randomSpeed(base: number, variation: number): number {
  if (variation <= 0) return base
  const delta = (Math.random() * 2 - 1) * variation
  return base + delta
}
