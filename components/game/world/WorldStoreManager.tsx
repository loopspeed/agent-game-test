'use client'

import { FC, useEffect } from 'react'

import { GameStage, useGameStore } from '@/stores/GameProvider'
import { useWorldStore } from '@/stores/WorldProvider'

const WorldStoreManager: FC = () => {
  const stage = useGameStore((s) => s.stage)

  const start = useWorldStore((s) => s.start)
  const reset = useWorldStore((s) => s.reset)
  const updatePlayerPosition = useWorldStore((s) => s.updatePlayerPosition)

  useEffect(() => {
    if (stage === GameStage.PLAYING) {
      // Start rhythm system
      start()
    }
  }, [stage, start, reset, updatePlayerPosition])

  // This component doesn't render anything
  return null
}

export default WorldStoreManager
