'use client'

import { type FC, useEffect } from 'react'

import { useLevelStore } from '@/stores/LevelProvider'
import { useInputStore } from '@/stores/useInputStore'

const GameInput: FC = () => {
  const { setKey } = useInputStore()
  const pause = useLevelStore((s) => s.pause)
  const resume = useLevelStore((s) => s.resume)
  const isPaused = useLevelStore((s) => s.isPaused)
  const isSlowMo = useLevelStore((s) => s.isSlowMo)
  const goFullSpeed = useLevelStore((s) => s.goFullSpeed)

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
        case 'Space':
        case 'Enter': {
          if (isSlowMo) {
            goFullSpeed()
          }
          console.warn('[DEBUG] User hit space or enter')
          break
        }
        case 'Escape': {
          if (!isPaused) {
            console.warn('[DEBUG] User paused game with Escape')
            pause()
          } else {
            resume()
          }
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
  }, [setKey, pause, resume, isPaused, isSlowMo, goFullSpeed])

  // This component doesn't render anything, it just handles input
  return null
}

export default GameInput
