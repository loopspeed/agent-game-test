'use client'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Leva, useControls } from 'leva'
import { type FC, Suspense, useEffect } from 'react'
import React from 'react'

import DebugDisplay from '@/components/debug/RhythmDebugDisplay'
import RhythmSystemManager from '@/components/game/RhythmSystemManager'
import Scene from '@/components/game/Scene'
import GameUI from '@/components/ui/GameUI'
import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { GameProvider, useGameStore } from '@/stores/GameProvider'
import { useInputStore } from '@/stores/useInputStore'
import { useWorldStore } from '@/stores/WorldProvider'

// Custom theme to make controls much bigger and more visible
const LEVA_CONTROLS_THEME = {
  fontSizes: {
    root: '12px', // Increased from default 11px to 14px for better readability
  },
  sizes: {
    rootWidth: '480px', // Increased from default 280px for more width
    controlWidth: '220px', // Increased from default 160px for wider controls
    rowHeight: '32px', // Increased from default 24px for taller rows
    folderTitleHeight: '28px', // Increased from default 20px for taller folder titles
  },
  space: {
    sm: '8px', // Increased from default 6px
    md: '14px', // Increased from default 10px
    rowGap: '8px', // Increased from default 7px for more spacing between rows
    colGap: '8px', // Increased from default 7px for more spacing between columns
  },
}

const GameContent: FC = () => {
  const resetStore = useGameStore((s) => s.resetStore)

  useEffect(() => {
    return () => {
      resetStore()
    }
  }, [resetStore])

  useKeypadInput()

  return (
    <main className="h-lvh w-full overflow-hidden">
      <RhythmSystemManager />
      <Canvas
        className="!fixed inset-0 !h-lvh"
        performance={{ min: 0.2, debounce: 300 }}
        gl={{ powerPreference: 'low-power', antialias: false, alpha: false }}
        camera={{ position: [0, 0.2, 4], fov: 75, far: 50 }}>
        {/* <CameraMovement /> */}
        {/* <Stats /> */}
        <DeveloperControls />

        <Suspense fallback={null}>
          {/* Physics world with zero gravity (kinematic bodies only) */}
          <Physics gravity={[0, 0, 0]} debug={true}>
            <Scene />
          </Physics>
        </Suspense>
      </Canvas>

      <GameUI />
      <DebugDisplay />
      <Leva theme={LEVA_CONTROLS_THEME} />
    </main>
  )
}

export default function GamePage() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  )
}

const DeveloperControls: FC = () => {
  const setTimeMultiplier = useWorldStore((s) => s.setTimeMultiplier)
  const timeMultiplier = useWorldStore((s) => s.timeMultiplier)
  const phaseDurations = useWorldStore((s) => s.phaseDurations)
  const setPhaseDurations = useWorldStore((s) => s.setPhaseDurations)
  const slowMoDuration = useWorldStore((s) => s.slowMoDuration)
  const setSlowMoDuration = useWorldStore((s) => s.setSlowMoDuration)
  const obstacleSpawnInterval = useWorldStore((s) => s.obstacleSpawnInterval)
  const setObstacleSpawnInterval = useWorldStore((s) => s.setObstacleSpawnInterval)

  const [, setControls] = useControls('Game', () => {
    return {
      time: {
        label: 'Time Multiplier',
        min: 0.1,
        step: 0.1,
        max: 2,
        value: timeMultiplier,
        onChange: (value) => setTimeMultiplier(value),
      },
      slowMoDuration: {
        label: 'Slow-Mo Duration',
        min: 0.5,
        step: 0.1,
        max: 5,
        value: slowMoDuration,
        onChange: (value) => setSlowMoDuration(value),
      },
      obstacleSpawnInterval: {
        label: 'Obstacle Spawn Interval',
        min: 0.5,
        step: 0.1,
        max: 3,
        value: obstacleSpawnInterval,
        onChange: (value) => setObstacleSpawnInterval(value),
      },
      introDuration: {
        label: 'Intro Phase Duration',
        min: 0.5,
        step: 0.1,
        max: 10,
        value: phaseDurations.INTRO,
        onChange: (value) => setPhaseDurations({ ...phaseDurations, INTRO: value }),
      },
      restDuration: {
        label: 'Rest Phase Duration',
        min: 1,
        step: 0.5,
        max: 10,
        value: phaseDurations.REST,
        onChange: (value) => setPhaseDurations({ ...phaseDurations, REST: value }),
      },
      obstaclesDuration: {
        label: 'Obstacles Phase Duration',
        min: 2,
        step: 0.5,
        max: 20,
        value: phaseDurations.OBSTACLES,
        onChange: (value) => setPhaseDurations({ ...phaseDurations, OBSTACLES: value }),
      },
      questionDuration: {
        label: 'Question Phase Duration',
        min: 3,
        step: 0.5,
        max: 20,
        value: phaseDurations.QUESTION,
        onChange: (value) => setPhaseDurations({ ...phaseDurations, QUESTION: value }),
      },
      outroDuration: {
        label: 'Outro Phase Duration',
        min: 0.5,
        step: 0.1,
        max: 10,
        value: phaseDurations.OUTRO,
        onChange: (value) => setPhaseDurations({ ...phaseDurations, OUTRO: value }),
      },
    }
  })

  // Sync controls with the store state
  useTimeSubscription((currentTimeMultiplier) => {
    setControls({
      time: currentTimeMultiplier,
      slowMoDuration,
      obstacleSpawnInterval,
      introDuration: phaseDurations.INTRO,
      restDuration: phaseDurations.REST,
      obstaclesDuration: phaseDurations.OBSTACLES,
      questionDuration: phaseDurations.QUESTION,
      outroDuration: phaseDurations.OUTRO,
    })
  })

  return null
}

function useKeypadInput() {
  const { setKey } = useInputStore()

  // Attach keyboard listeners for 4-way movement
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W': {
          setKey('up', true)
          break
        }
        case 'ArrowDown':
        case 's':
        case 'S': {
          setKey('down', true)
          break
        }
        case 'ArrowLeft':
        case 'a':
        case 'A': {
          setKey('left', true)
          break
        }
        case 'ArrowRight':
        case 'd':
        case 'D': {
          setKey('right', true)
          break
        }
        default:
          break
      }
    }
    const up = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setKey('up', false)
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          setKey('down', false)
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setKey('left', false)
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          setKey('right', false)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [setKey])
}
