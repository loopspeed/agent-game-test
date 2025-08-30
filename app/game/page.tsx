'use client'
import { Suspense, useEffect } from 'react'
import { Physics } from '@react-three/rapier'
import Scene from '@/components/Scene'
import { useInputStore } from '@/stores/inputStore'
import { useWorldStore } from '@/stores/worldStore'

import { Canvas } from '@react-three/fiber'
import React from 'react'
import { useControls } from 'leva'

export default function GamePage() {
  const isPlaying = useWorldStore((s) => s.isPlaying)

  useInput()

  useControls({
    speed: {
      label: 'Speed',
      min: 0.1,
      step: 0.1,
      max: 10,
      value: useWorldStore.getState().speed,
      onChange: (value) => useWorldStore.setState({ speed: value }),
    },
    maxObstacles: {
      label: 'Max Obstacles',
      min: 4,
      step: 1,
      max: 40,
      value: useWorldStore.getState().maxObstacles,
      onChange: (value) => useWorldStore.setState({ maxObstacles: value }),
    },
    spawnInterval: {
      label: 'Spawn Interval (seconds)',
      min: 0.1,
      max: 5.0,
      step: 0.1,
      value: useWorldStore.getState().spawnInterval,
      onChange: (value) => useWorldStore.setState({ spawnInterval: value }),
    },
  })

  return (
    <main className="relative h-lvh w-full overflow-hidden">
      <Canvas
        className="!fixed inset-0"
        performance={{ min: 0.5, debounce: 300 }}
        camera={{ position: [0, 1, 4], fov: 80, far: 50 }}>
        <Suspense fallback={null}>
          {/* Physics world with zero gravity (kinematic bodies only) */}
          <Physics gravity={[0, 0, 0]}>
            <Scene />
          </Physics>
        </Suspense>
      </Canvas>
      {/* Heads-up display overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-4">
        {/* Future HUD components (score, health, streak, timer) will be inserted here */}
        <button className="pointer-events-auto cursor-pointer rounded-full border px-4 py-1 hover:bg-green-700">
          PRESS ENTER TO {isPlaying ? 'STOP' : 'BEGIN'}
        </button>
      </div>
    </main>
  )
}

function useInput() {
  const { setKey } = useInputStore()
  const toggleIsPlaying = useWorldStore((s) => s.toggleIsPlaying)

  // Attach keyboard listeners for 4-way movement
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter': {
          toggleIsPlaying()
          break
        }
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
  }, [setKey, toggleIsPlaying])
}
