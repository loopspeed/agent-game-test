'use client'

import { FC, useEffect } from 'react'

import { GameStage, useGameStore } from '@/stores/GameProvider'
import { useWorldStore } from '@/stores/WorldProvider'

/**
 * Component responsible for managing the rhythm system lifecycle
 * in response to game stage changes.
 */
export const RhythmSystemManager: FC = () => {
  const stage = useGameStore((s) => s.stage)

  const start = useWorldStore((s) => s.start)
  const stop = useWorldStore((s) => s.stop)
  const reset = useWorldStore((s) => s.reset)
  const updatePlayerPosition = useWorldStore((s) => s.updatePlayerPosition)

  useEffect(() => {
    if (stage === GameStage.PLAYING) {
      // Start rhythm system
      start()
    } else {
      // Stop rhythm system
      stop()
      // Reset when going to intro
      if (stage === GameStage.INTRO) {
        reset()
      }
    }
  }, [stage, start, stop, reset, updatePlayerPosition])

  // This component doesn't render anything
  return null
}

export default RhythmSystemManager
