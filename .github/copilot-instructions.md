# GitHub Copilot Instructions

## Project Overview

This is an educational 3D runner game built with Next.js, React Three Fiber, and Rapier physics.
Players navigate a spaceship through answer gates while avoiding obstacles, answering questions as they go.

## Architecture & Core Systems

### State Management Pattern

- **Global Game State**: `stores/GameProvider.tsx` uses Zustand with React Context pattern
- **Input State**: `stores/useInputStore.ts` separate Zustand store for keyboard input
- **Time Synchronization**: `hooks/useTimeSubscription.ts` syncs GSAP animations with game state
- **GSAP Integration**: Time scaling and visual effects use GSAP timelines, not React state

### 3D Game Components Structure

```
Scene.tsx (root 3D container)
├── Player.tsx (kinematic physics body with lane-based movement)
├── Obstacles.tsx (instanced rigid bodies with object pooling)
└── AnswerGates.tsx (3x3 grid of collision sensors)
```

### Physics & Collision System

- **Rapier Physics**: Zero gravity, kinematic bodies only
- **Collision Detection**: Uses `sensor={true}` rigid bodies with `onIntersectionEnter`
- **User Data Pattern**: All physics bodies have typed `userData` for collision handling
- **Lane System**: Player moves between discrete positions using `LANES_X/LANES_Y` arrays

## Key Development Patterns

### Performance Optimization

- **Instanced Rendering**: Obstacles use `InstancedRigidBodies` for hundreds of objects
- **Ref-based State**: Mutable game data stored in `useRef` to avoid React re-renders
- **Object Pooling**: Reuse physics bodies instead of creating/destroying

### Input Handling

- **Discrete Movement**: Arrow keys/WASD trigger lane changes, not continuous movement
- **Input State**: Previous frame comparison in `useRef` to detect key press events
- **Smooth Interpolation**: `THREE.MathUtils.damp` for smooth movement between lanes

## Development Workflow

### Local Development

```bash
npm run dev    # Start development server on localhost:3000
npm run build  # Production build
```

### Debug Tools

- **Leva Controls**: Runtime adjustment of game parameters (time, spawn rate, max obstacles)
- **Physics Debug**: Set `debug={true}` in Physics component to see collision boxes
- **R3F Stats**: Performance monitoring with `<Stats />` component

### Key File Relationships

- `data/questions.ts`: Question data structure and sample content
- `model/game.ts`: TypeScript types for physics collision userData
- `logic/spawn.ts`: Utility functions for positioning (partially implemented)
- `components/HUD.tsx`: UI overlay with health display and question text

## Common Patterns

### Adding New Game Mechanics

1. Add state to `GameProvider.tsx` store
2. Create physics bodies with typed `userData` in `model/game.ts`
3. Handle collisions in component's `onIntersectionEnter`
4. Use `useTimeSubscription` for animations that need time scaling

### Physics Body Creation

```tsx
<RigidBody
  type="kinematicPosition" // or "dynamic" for moving objects
  sensor={true}            // for collision detection without physics response
  userData={{ type: 'obstacle' }} // typed collision data
  onIntersectionEnter={handleCollision}>
```

### State Updates with Visual Feedback

```tsx
// Pattern: Immediate state update + GSAP visual animation
onAnswerHit(isCorrect)
gsap.to(materialRef.current.color, {
  r: color.r,
  g: color.g,
  b: color.b,
  duration: 0.2,
})
```

## Architecture Notes

- **No Traditional Game Engine**: Built on web standards (Three.js/React)
- **Functional Programming**: Heavy use of React hooks and functional components
- **Immutable Updates**: Zustand store uses immutable update patterns
- **Client-Side Only**: No server state, all game logic runs in browser
