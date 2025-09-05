# Rhythm-Based Level Generation System

This implementation provides a comprehensive rhythm-based level generation system that replaces random obstacle and answer gate spawning with structured, musical timing patterns.

## Overview

The system is based on Jan Kočur's research on dynamic difficulty in endless runners, treating player actions as musical "beats" with run-up, action, and recovery phases. This creates more predictable, learnable patterns while maintaining variety and progressive difficulty.

## Core Components

### 1. RhythmLevelGenerator (`/services/RhythmLevelGenerator.ts`)

The main generator that creates rhythm-based level segments:

- **ActionType Enum**: Defines player actions (lane changes, up/down movement, answer gates, rest)
- **RhythmNote**: Individual actions with timing and spatial data
- **LevelSegment**: Collections of notes with difficulty budgets
- **ActionDefinition**: Rules and constraints for each action type

**Key Features:**

- Verse-chorus structure with pattern repetition and variation
- Difficulty budgeting to prevent overwhelming complexity
- Constraint-based action sequencing (e.g., no consecutive jumps)
- Solution-first generation ensuring playable paths

### 2. LevelManager (`/services/LevelManager.ts`)

Manages level segment generation and converts rhythm notes into spawnable events:

- Pre-generates segments ahead of gameplay
- Converts abstract rhythm notes to concrete spawn data
- Handles obstacle and answer gate event queuing
- Provides debug information for tuning

### 3. RhythmService (`/services/RhythmService.ts`)

High-level service interface for game integration:

- Simple start/stop/reset lifecycle
- Event filtering and conversion
- Performance feedback integration
- Upcoming event preview

### 4. useRhythmSystem Hook (`/hooks/useRhythmSystem.ts`)

React hook for component integration:

- Automatic game state synchronization
- Frame-based updates
- Performance tracking
- Type-safe event handling

## Integration Guide

### Replacing Random Spawning

The existing random spawning system in `Obstacles.tsx` and `AnswerGates.tsx` can be replaced with rhythm-based spawning:

#### Before (Random):

```typescript
// Random timing with spawnInterval
if (deadObstacleIndex !== -1 && timeSinceLastSpawn >= spawnInterval) {
  const newData = getNewSphereObstacleData({ isAlive: true, lanesToAvoid })
  // Spawn at random position
}
```

#### After (Rhythm-based):

```typescript
// Structured timing from rhythm system
const obstaclesToSpawn = getObstaclesToSpawn()
obstaclesToSpawn.forEach((rhythmObstacle) => {
  // Spawn at specific lanes with action context
  const spawnPositions = getObstacleSpawnPositions(rhythmObstacle)
  // Spawn with metadata about required player action
})
```

### Key Changes Required

1. **Replace timing logic**: Remove random intervals, use rhythm system updates
2. **Replace positioning**: Use rhythm-specified lanes instead of random selection
3. **Add action context**: Include information about what player action is required
4. **Coordinate with answer gates**: Use rhythm system for synchronized spawning

### Example Integration

See the example components:

- `/components/examples/RhythmObstacles.tsx` - Shows obstacle integration pattern
- `/components/examples/RhythmAnswerGates.tsx` - Shows answer gate integration pattern

## Action Types and Obstacle Mapping

### Lane Changes

- **Left/Right**: Block current lane to force movement
- **Run-up**: 1.0-2.0 seconds for player preparation
- **Recovery**: 0.5 seconds before next action

### Up Movement Actions

- **Trigger**: Block current and lower rows with sphere obstacles to force upward movement
- **Run-up**: 1.2-2.5 seconds (more time for spatial awareness)
- **Recovery**: 0.8 seconds for repositioning

### Down Movement Actions

- **Trigger**: Block current and upper rows with beam obstacles to force downward movement
- **Run-up**: 1.0-2.0 seconds
- **Recovery**: 0.6 seconds

### Answer Gates

- **Timing**: Every 15-20 seconds with dedicated slots
- **Run-up**: 2.0-3.0 seconds for reading
- **Duration**: 2.0 seconds for selection
- **Recovery**: 1.5 seconds before next action

## Rhythm Patterns

### Verse Segments

- Varied action types
- Lower difficulty budget
- Exploration of different mechanics

### Chorus Segments

- Repeated action patterns
- Higher difficulty budget
- Reinforcement of learned patterns

### Bridge Segments

- Complex action combinations
- Maximum difficulty budget
- Challenge and variation

### Rest Segments

- Minimal obstacles
- Recovery time
- Prepare for next pattern

## Difficulty Progression

- **Initial Budget**: 5 difficulty points
- **Maximum Budget**: 15 difficulty points
- **Ramp Rate**: +0.1 points per segment
- **Action Costs**: Lane change (1), Up/Down movement (2), Answer gate (3), Rest (0)

## Configuration Options

The system can be tuned via:

```typescript
const rhythmService = new RhythmService({
  questions: gameQuestions,
  baseObstacleSpeed: 12.0,
  baseAnswerGateSpeed: 5.5,
  segmentDuration: 8.0,
})
```

## Performance Feedback

The system accepts player performance data to adjust difficulty:

```typescript
rhythmService.reportPlayerPerformance({
  correctAnswers: 5,
  incorrectAnswers: 2,
  obstacleHits: 1,
  currentStreak: 3,
})
```

## Debug Information

Comprehensive debug data is available:

```typescript
const debugInfo = rhythmService.getDebugInfo()
// Returns: current segment type, difficulty usage, upcoming events, etc.
```

## Benefits Over Random Spawning

1. **Predictable Patterns**: Players can learn and anticipate challenges
2. **Structured Difficulty**: Gradual progression with budgeted complexity
3. **Musical Rhythm**: Natural flow with rest periods and pattern repetition
4. **Solution Guaranteed**: Always ensures playable paths
5. **Even Answer Gates**: Consistent timing instead of random bunching
6. **Action Context**: Each obstacle has clear purpose and required response

## Next Steps

1. **Replace Obstacles Component**: Integrate rhythm system into existing `SphereObstacles` and `BeamObstacles`
2. **Replace AnswerGates Component**: Update to use rhythm-based timing
3. **Update GameProvider**: Remove old spawning parameters (`spawnInterval`, random positioning)
4. **Add Performance Tracking**: Connect player actions to rhythm feedback
5. **Tune Difficulty**: Adjust action definitions and budgets based on playtesting

This system provides the foundation for engaging, fair, and progressively challenging endless runner gameplay with structured educational content integration.
