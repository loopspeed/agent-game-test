# Educational 3D Runner Game with AI-Powered Content Generation

## Architecture Overview

This educational game combines a 3D runner experience with an intelligent AI agent that creates, manages, and facilitates quiz-based learning. The system is built with Next.js, React Three Fiber, and Rapier physics, featuring an LLM-powered assistant that handles the complete learning workflow from content creation to gameplay assessment.

## AI Agent System

### Core Agent Architecture

The game features **TestOwl**, an AI assistant powered by OpenAI's GPT models that serves as the primary interface for content creation and game management. The agent operates through a sophisticated tool-calling system that bridges conversational AI with game mechanics.

#### Agent Capabilities

- **Content Extraction**: Fetches and processes educational content from web URLs
- **Quiz Generation**: Transforms source material into structured quiz questions with multiple choice answers
- **Course Management**: Creates, stores, and organizes educational courses with chapters
- **Game Integration**: Launches and monitors gameplay sessions
- **Performance Analysis**: Provides detailed feedback on player performance

### Tool Integration System

The AI agent uses a comprehensive set of tools to manage the educational experience:

#### Content Creation Tools

- `extractContentFromWebsite({ url })`: Fetches and cleans text content from web pages
- `authorTestMarkdown({ title, text, url })`: Generates quiz content in structured Markdown format
- `formatTestForGame({ markdown, url })`: Converts Markdown to validated Course JSON objects

#### Game Management Tools

- `storeCourse({ course })`: Saves courses to client-side storage
- `playChapter({ courseId, chapterId })`: Initiates gameplay for specific chapters
- `getCourses({})`: Retrieves all saved courses for selection

### Conversational Workflow

The agent follows a structured conversation flow:

1. **Onboarding**: Greets users and identifies learning topics
2. **Content Gathering**: Accepts URLs or pasted text for quiz creation
3. **Course Generation**: Creates structured educational content with explanations
4. **Game Launch**: Initiates 3D runner gameplay with generated questions
5. **Performance Review**: Provides detailed feedback and suggests next steps

### Data Flow Architecture

```typescript
User Input → AI Agent → Tool Execution → Game State Update → 3D Gameplay → Results Analysis
```

#### Content Generation Pipeline

1. **Source Material**: User provides URL or text content
2. **AI Processing**: GPT model creates quiz questions following strict templates
3. **Validation**: Content validates against CourseSchema for game compatibility
4. **Storage**: Courses saved to browser localStorage via Zustand stores
5. **Gameplay**: 3D runner integrates quiz questions as interactive gate mechanics

### Game Integration

The AI agent seamlessly integrates with the 3D runner mechanics:

- **Phase Management**: Controls game phases (intro, obstacles, questions, outro)
- **Question Timing**: Triggers question gates at appropriate gameplay moments
- **Answer Validation**: Processes player responses and calculates scores
- **Performance Tracking**: Records completion times, accuracy, and point totals

## Level Generation System

The level generation system has been dramatically simplified to use a single event-based approach. All complex state management around segments, rhythm notes, and the RhythmLevelGenerator has been removed in favor of a straightforward event queue managed directly in the LevelProvider store.

### Simplified Design

The level system now works as follows:

1. **AI-Generated Content**: TestOwl creates educational courses from user-provided materials
2. **Phase-Based Gameplay**: Fixed repeating pattern provides consistent 3D runner experience
3. **Question Integration**: AI-generated quiz questions appear as interactive gates during gameplay
4. **Real-time Assessment**: Player responses are evaluated and fed back to the AI agent

### Core Benefits

- **Intelligent Content Creation**: AI generates contextually relevant quiz questions from any source material
- **Seamless Integration**: Conversational interface bridges content creation and gameplay
- **Personalized Learning**: AI adapts content difficulty and provides targeted feedback
- **Performance Analytics**: Detailed tracking of learning progress and game performance
- **Simplified Architecture**: Single function generates all events upfront with AI-powered content

### Data Flow

1. **AI Agent** initiates conversation and gathers learning requirements
2. **Content Processing** extracts and structures educational material into quiz format
3. **Course Storage** validates and saves generated courses to client-side store
4. **Game Launch** triggers 3D runner with AI-generated questions as gameplay elements
5. **Performance Analysis** feeds results back to AI agent for personalized feedback

## AI-Powered Educational Content

### Question Generation System

The AI agent uses advanced prompt engineering to create high-quality educational content:

#### Content Standards

- **Source Fidelity**: All questions must be grounded in provided source material
- **UK English**: Consistent language and spelling conventions
- **Quality Assurance**: Avoids trick questions, ambiguous phrasing, and "all/none of the above" options
- **Balanced Difficulty**: Includes recall, understanding, and application-level questions

#### Structured Output Format

```markdown
# Course Title

## Chapter: Chapter Title

Summary: Brief overview from source material

Q1. Clear question stem

- a) Option one
- b) Option two
- c) Correct answer (correct)
- d) Option four

Explanation: Grounded explanation with source citation
Source: "Verbatim excerpt from source material" — URL
```

#### Validation Pipeline

1. **Schema Validation**: Generated content validates against strict TypeScript schemas
2. **Content Verification**: Ensures all questions derive from source material
3. **Format Consistency**: Maintains uniform structure for game integration
4. **Answer Distribution**: Randomizes correct answers across choice positions

### Learning Analytics

The system tracks comprehensive learning metrics:

- **Response Accuracy**: Correct/incorrect answer tracking per question
- **Completion Time**: Time spent on each chapter and overall course
- **Point Scoring**: Game-based scoring system with obstacle avoidance bonuses
- **Streak Tracking**: Consecutive correct answers and performance patterns
- **Progress History**: Persistent storage of all learning sessions

## Core Game Systems

### Event System Types

```typescript
export enum EventType {
  LANE_CHANGE = 'LANE_CHANGE', // Forces player to move by blocking current lane
  CLUSTER = 'CLUSTER', // Blocks all lanes except one safe lane
  ANSWER_GATE = 'ANSWER_GATE',
  REST = 'REST', // Breathing room between actions
}

export type GameEvent = {
  id: string
  type: EventType
  spawnTime: number // Game time when event should trigger

  // For obstacle events
  obstacleLanes?: number[] // Which lanes to place obstacles in
  obstacleType?: 'sphere' | 'beam'

  // For answer gate events
  question?: Question
  answerMapping?: (Answer | null)[] // Answer mapping for 3x3 grid
}
```

### State Management Pattern

```typescript
// WorldProvider manages all event system state directly
type WorldState = {
  gameEvents: GameEvent[] // Complete pre-generated event sequence
  obstaclesToSpawn: ObstacleSpawnData[]
  answerGatesToSpawn: AnswerGateSpawnData[]

  // Core event system methods
  start: () => void
  stop: () => void
  reset: () => void
  update: (gameTime: number) => void
  getNextAnswerGateForUI: () => AnswerGateSpawnData | null
  getUpcomingObstacles: (lookAheadTime?: number) => ObstacleSpawnData[]
}

// Components access event data through store selectors
const obstaclesToSpawn = useWorldStore((s) => s.obstaclesToSpawn)
const answerGatesToSpawn = useWorldStore((s) => s.answerGatesToSpawn)
```

## Core Implementation

### Event Generation

The entire level is generated upfront when the WorldProvider store is created:

```typescript
// Generate the complete sequence of events for a level
const generateLevelEvents = (questions: Question[]): GameEvent[] => {
  const events: GameEvent[] = []
  let currentTime = 2.0 // Start after a brief delay
  let patternIndex = 0
  let questionIndex = 0
  let currentPlayerLane = 4 // Start in center

  // Fixed pattern sequence
  const PATTERN_SEQUENCE = [
    EventType.LANE_CHANGE,
    EventType.CLUSTER,
    EventType.LANE_CHANGE,
    EventType.CLUSTER,
    EventType.REST,
    EventType.ANSWER_GATE,
  ]

  // Generate events until we've used all questions
  while (questionIndex < questions.length) {
    const eventType = PATTERN_SEQUENCE[patternIndex]

    if (eventType === EventType.ANSWER_GATE) {
      // Generate answer gate event
      const question = questions[questionIndex]
      const answerMapping = generateAnswerMapping(question.answers)

      events.push({
        id: `${eventType}_${currentTime}`,
        type: EventType.ANSWER_GATE,
        spawnTime: currentTime,
        question,
        answerMapping,
      })

      questionIndex++
      currentTime += 2.0
    } else if (eventType === EventType.REST) {
      // Just add time, no event
      currentTime += 1.0
    } else {
      // Generate obstacle event
      const placement = generateObstaclePlacement(eventType, currentPlayerLane)

      events.push({
        id: `${eventType}_${currentTime}`,
        type: eventType,
        spawnTime: currentTime,
        obstacleLanes: placement.obstacleLanes,
        obstacleType: eventType === EventType.CLUSTER ? 'beam' : 'sphere',
      })

      currentTime += 1.2 // TIME_BETWEEN_ACTIONS
    }

    patternIndex = (patternIndex + 1) % PATTERN_SEQUENCE.length
  }

  return events
}
```

### Runtime Processing

During gameplay, the WorldProvider simply filters events based on game time:

```typescript
// In WorldProvider.update()
const eventsToSpawn = state.gameEvents.filter(
  (event) => event.spawnTime <= gameTime && event.spawnTime > gameTime - 0.1,
)

// Convert events to spawn data
const obstaclesToSpawn = eventsToSpawn
  .filter((event) => event.type !== EventType.ANSWER_GATE && event.type !== EventType.REST)
  .map((event) => ({
    id: event.id,
    type: event.obstacleType || 'sphere',
    lanes: event.obstacleLanes || [],
    spawnTime: event.spawnTime,
    speed: state.gameSpeed,
    shouldSpawn: true,
    actionType: event.type,
  }))
```

## Integration Guide

### Current Implementation Status

The simplified event system is fully integrated through WorldProvider:

- **WorldProvider** (`/stores/WorldProvider.tsx`): Complete event system management including generation and spawning
- **RhythmObstacles** (`/components/game/world/RhythmObstacles.tsx`): Handles event-based obstacle spawning
- **AnswerGates** (`/components/game/world/AnswerGates.tsx`): Manages event-based answer gate timing
- **RhythmDebugDisplay** (`/components/debug/RhythmDebugDisplay.tsx`): Shows real-time event system information

### Integration Pattern

Components access event data directly through WorldProvider store methods:

```typescript
// In components
const obstaclesToSpawn = useWorldStore((s) => s.obstaclesToSpawn)
const answerGatesToSpawn = useWorldStore((s) => s.answerGatesToSpawn)
const upcomingObstacles = useWorldStore((s) => s.getUpcomingObstacles)(5) // 5 seconds ahead
```

### Event-Based Spawning System

All spawning is now controlled through the pre-generated event sequence:

```typescript
// In RhythmObstacles component
const obstaclesToSpawn = useWorldStore((s) => s.obstaclesToSpawn)

useFrame(() => {
  obstaclesToSpawn.forEach((obstacle) => {
    if (obstacle.shouldSpawn) {
      // Spawn at specific lanes based on event data
      const spawnPositions = getObstacleSpawnPositions(obstacle)
      // Spawn with event metadata
    }
  })
})
```

## Phase-Based Obstacle System

The game now uses a simplified phase-based approach instead of the complex event system. Obstacles are generated at phase transitions for strategic gameplay.

### Phase System

The game follows a cycle of phases:

- **INTRO**: 1 second introductory phase
- **REST**: 1 second breathing room
- **OBSTACLES**: 6 seconds of obstacles with strategic patterns
- **QUESTION**: 10 seconds for answering questions
- **OUTRO**: 3 second conclusion

### Obstacle Generation Strategy

When transitioning to the OBSTACLES phase, the system generates a complete sequence of obstacles using `generateObstacleSequence()`:

```typescript
export type ObstacleSpawnData = {
  id: string
  type: ObstacleType
  lanes: number[] // Which lanes to spawn obstacles in
  safeLanes: number[] // Which lanes are safe for the player
  spawnTime: number // Game time when obstacle should spawn
  speed: number
}
```

### Strategic Lane Patterns

Obstacles are generated with a 4-pattern cycle that forces strategic movement:

1. **Force Left**: Block center and right columns (lanes 1,2,4,5,7,8), safe lanes are left column (0,3,6)
2. **Force Right**: Block left and center columns (lanes 0,1,3,4,6,7), safe lanes are right column (2,5,8)
3. **Force Down**: Block top and middle rows (lanes 0,1,2,3,4,5), safe lanes are bottom row (6,7,8)
4. **Force Up**: Block middle and bottom rows (lanes 3,4,5,6,7,8), safe lanes are top row (0,1,2)

This creates a strategic back-and-forth movement pattern where each obstacle covers the safe zones from the previous obstacle.

### Configuration

```typescript
const PHASE_DURATIONS: Record<Phase, number> = {
  OBSTACLES: 6, // Total duration of obstacles phase
}
const OBSTACLE_SPAWN_INTERVAL = 0.5 // Spawn obstacle every 0.5 seconds
```

During a 6-second obstacles phase, this generates 12 obstacles (6 ÷ 0.5) with strategic lane coverage.

## Event Types and Obstacle Mapping

### Event Types

The system uses 4 core event types:

#### LANE_CHANGE

- **Purpose**: Block current lane to force movement
- **Obstacle Type**: Sphere
- **Timing**: 1.2 seconds between events

#### CLUSTER

- **Purpose**: Block multiple lanes except one safe lane
- **Obstacle Type**: Beam
- **Timing**: 1.2 seconds between events

#### REST

- **Purpose**: Breathing room between events
- **Duration**: 1.0 seconds of clear space
- **No obstacles spawned**

#### ANSWER_GATE

- **Purpose**: Question answering mechanic
- **Duration**: 2.0 seconds for question display and selection
- **No obstacles during answer gates**

## Event Pattern System

### Fixed Pattern Cycle

The system follows a predictable 6-event cycle:

1. **LANE_CHANGE**: Force horizontal movement
2. **CLUSTER**: Challenge spatial awareness
3. **LANE_CHANGE**: Force horizontal movement (variation)
4. **CLUSTER**: Challenge spatial awareness (variation)
5. **REST**: Provide recovery time
6. **ANSWER_GATE**: Educational content integration

This pattern repeats throughout the game, providing:

- **Consistency**: Players can learn and anticipate the pattern
- **Variety**: Each event type provides different challenges
- **Balance**: Regular rest periods prevent overwhelming difficulty
- **Educational Flow**: Answer gates appear predictably

### Benefits of Fixed Pattern

1. **Predictable Learning**: Players can master the event pattern
2. **Consistent Pacing**: Regular answer gates and rest periods
3. **Simplified Code**: No complex difficulty budgeting or state management
4. **Reliable Testing**: Deterministic behavior for easier debugging
5. **Performance**: All events pre-generated, no runtime complexity

## Configuration

The system is configured during WorldProvider initialization:

```typescript
// Event generation constants
const TIME_BETWEEN_ACTIONS = 1.2 // Base time between events
const PATTERN_SEQUENCE = [
  EventType.LANE_CHANGE,
  EventType.CLUSTER,
  EventType.LANE_CHANGE,
  EventType.CLUSTER,
  EventType.REST,
  EventType.ANSWER_GATE,
]
```

## Benefits Over Complex Systems

1. **Simplicity**: Single function generates entire level
2. **Performance**: No runtime generation or complex state
3. **Predictability**: Fixed pattern provides consistent gameplay
4. **Maintainability**: All logic in one place
5. **Testing**: Deterministic behavior for reliable QA
6. **Memory Efficiency**: Events generated once, processed as needed

## Current Implementation Status

### ✅ Completed Features

- [x] **Simplified Event Generation**: Single function creates complete event sequence
- [x] **Event-Based Processing**: Runtime filtering of pre-generated events
- [x] **Fixed Pattern System**: 6-event cycle with predictable progression
- [x] **WorldProvider Integration**: Complete event system management in store
- [x] **Component Integration**: RhythmObstacles and AnswerGates use event data
- [x] **Legacy System Removal**: Eliminated RhythmLevelGenerator and complex state management

### 🚧 Future Enhancements (Optional)

- [ ] **Pattern Variations**: Could add multiple pattern sequences
- [ ] **Dynamic Timing**: Could adjust timing based on player performance
- [ ] **Advanced Obstacle Types**: Could add more obstacle variety

This dramatically simplified system provides the same gameplay benefits with a fraction of the complexity, making it much easier to maintain and extend.
