'use client'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useControls } from 'leva'
import { Suspense, useEffect } from 'react'
import React from 'react'

import HUD from '@/components/HUD'
import Scene from '@/components/Scene'
import { useInputStore } from '@/stores/inputStore'
import GameProvider, { useGameStore, useGameStoreApi } from '@/stores/useGameStore'

function GameContent() {
  const reset = useGameStore((s) => s.reset)
  const gameStoreApi = useGameStoreApi()

  // Extract values outside of useControls to avoid breaking rules of hooks
  const obstaclesSpeed = useGameStore((s) => s.obstaclesSpeed)
  const maxObstacles = useGameStore((s) => s.maxObstacles)
  const spawnInterval = useGameStore((s) => s.spawnInterval)

  useEffect(() => {
    return () => {
      reset()
    }
  }, [reset])

  useInput()

  useControls({
    time: {
      label: 'Obstacle Speed',
      min: 0.1,
      step: 0.1,
      max: 5,
      value: obstaclesSpeed,
      onChange: (value) => gameStoreApi.getState().setObstaclesSpeed(value),
    },
    maxObstacles: {
      label: 'Max Obstacles',
      min: 4,
      step: 1,
      max: 40,
      value: maxObstacles,
      onChange: (value) => gameStoreApi.getState().setMaxObstacles(value),
    },
    spawnInterval: {
      label: 'Spawn Interval (seconds)',
      min: 0.1,
      max: 5.0,
      step: 0.1,
      value: spawnInterval,
      onChange: (value) => gameStoreApi.getState().setSpawnInterval(value),
    },
  })

  return (
    <main className="h-lvh w-full overflow-hidden">
      <Canvas
        className="!fixed inset-0 !h-lvh"
        performance={{ min: 0.5, debounce: 300 }}
        camera={{ position: [0, 0.5, 4], fov: 75, far: 50 }}>
        <Suspense fallback={null}>
          {/* Physics world with zero gravity (kinematic bodies only) */}
          <Physics gravity={[0, 0, 0]} debug>
            <Scene />
          </Physics>
        </Suspense>
      </Canvas>

      {/* HUD overlay with health display */}
      <HUD />
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

function useInput() {
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
