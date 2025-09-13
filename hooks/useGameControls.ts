import { useCallback } from 'react'

import { useGameStore } from '@/stores/GameProvider'
import { useLevelStore } from '@/stores/LevelProvider'
import { useConfigStore } from '@/stores/useConfigStore'

function useGameControls() {
  const getLevelConfig = useConfigStore((s) => s.getLevelConfig)
  const startGame = useGameStore((s) => s.start)
  const resetGame = useGameStore((s) => s.reset)

  const startLevel = useLevelStore((s) => s.start)
  const resetLevel = useLevelStore((s) => s.reset)

  const handleStart = useCallback(() => {
    startGame()
    startLevel(getLevelConfig())
  }, [startGame, startLevel, getLevelConfig])

  const handleReplay = useCallback(() => {
    resetGame()
    resetLevel()
  }, [resetLevel, resetGame])

  return { handleStart, handleReplay }
}

export default useGameControls
