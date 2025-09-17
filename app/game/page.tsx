'use client'

import { type FC, useEffect } from 'react'
import React from 'react'

// import DebugDisplay from '@/components/debug/DebugDisplay'
import LevelCanvas from '@/components/game/level/LevelCanvas'
import GameUI from '@/components/ui/GameUI'
import { GameProvider, useGameStore } from '@/stores/GameProvider'
import { useLevelStore } from '@/stores/LevelProvider'
import { SoundProvider } from '@/stores/SoundProvider'
import { useInputStore } from '@/stores/useInputStore'

const GameContent: FC = () => {
  const resetGame = useGameStore((s) => s.reset)
  const resetLevel = useLevelStore((s) => s.reset)

  useEffect(() => {
    return () => {
      resetGame()
      resetLevel()
    }
  }, [resetGame, resetLevel])

  useKeypadInput()

  return (
    <main className="h-lvh w-full overflow-hidden">
      <LevelCanvas />
      <GameUI />
      {/* <DebugDisplay /> */}
    </main>
  )
}

export default function GamePage() {
  return (
    <SoundProvider>
      <GameProvider>
        <GameContent />
      </GameProvider>
    </SoundProvider>
  )
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
