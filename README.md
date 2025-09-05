# Simplified Event-Based Level Generation System

## Architecture Overview

The level generation system has been dramatically simplified to use a single event-based approach. All complex state management around segments, rhythm notes, and the RhythmLevelGenerator has been removed in favor of a straightforward event queue managed directly in the WorldProvider store.

### Simplified Design

The system now works as follows:

1. **Single Function Generation**: When the WorldProvider store is created, one function (`generateLevelEvents`) creates the entire sequence of events for the level
2. **Event-Based Pattern**: Events follow a fixed repeating pattern: **LANE_CHANGE → CLUSTER → LANE_CHANGE → CLUSTER → REST → ANSWER_GATE**
3. **Direct State Management**: All necessary state lives directly in the WorldProvider store, with no separate generator class

### Core Benefits

- **Simplicity**: Single function generates all events upfront
- **Predictability**: Fixed pattern provides consistent gameplay
- **Performance**: No runtime generation or complex state management
- **Maintainability**: All logic in one place with minimal abstraction

### Data Flow

1. **generateLevelEvents()** creates complete event sequence during store initialization
2. **WorldProvider.update()** processes events at runtime based on game time
3. **Components** consume spawn data directly from store state

## Core Types

### Event System

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
