'use client'

import { type FC, useEffect } from 'react'

import { GameStage, useGameStore } from '@/stores/GameProvider'
import { useLevelStore } from '@/stores/LevelProvider'

const LevelManager: FC = () => {
  const stage = useGameStore((s) => s.stage)

  const start = useLevelStore((s) => s.start)
  const reset = useLevelStore((s) => s.reset)
  const updatePlayerPosition = useLevelStore((s) => s.updatePlayerPosition)

  useEffect(() => {
    if (stage === GameStage.PLAYING) {
      // Start rhythm system
      start()
    }
  }, [stage, start, reset, updatePlayerPosition])

  // This component doesn't render anything
  return null
}

export default LevelManager
