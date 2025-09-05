'use client'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useControls } from 'leva'
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
        <DebugControls />

        <Suspense fallback={null}>
          {/* Physics world with zero gravity (kinematic bodies only) */}
          <Physics gravity={[0, 0, 0]} debug={true}>
            <Scene />
          </Physics>
        </Suspense>
      </Canvas>

      <GameUI />
      <DebugDisplay />
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

const DebugControls: FC = () => {
  const setTimeMultiplier = useWorldStore((s) => s.setTimeMultiplier)
  const timeMultiplier = useWorldStore((s) => s.timeMultiplier)

  const [, setControls] = useControls('Game', () => {
    return {
      time: {
        label: 'Time',
        min: 0.1,
        step: 0.1,
        max: 2,
        value: timeMultiplier,
        onChange: (value) => setTimeMultiplier(value),
      },
    }
  })

  // Sync controls with the store state
  useTimeSubscription((currentTimeMultiplier) => {
    setControls({
      time: currentTimeMultiplier,
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
