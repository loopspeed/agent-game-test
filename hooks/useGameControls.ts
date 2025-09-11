import { useCallback } from 'react'

import { useGameStore } from '@/stores/GameProvider'
import { useLevelStore } from '@/stores/LevelProvider'

function useGameControls() {
  const startGame = useGameStore((s) => s.start)
  const resetGame = useGameStore((s) => s.reset)

  const startLevel = useLevelStore((s) => s.start)
  const resetLevel = useLevelStore((s) => s.reset)

  const handleStart = useCallback(() => {
    startGame()
    startLevel()
  }, [startGame, startLevel])

  const handleReplay = useCallback(() => {
    resetGame()
    resetLevel()
  }, [resetLevel, resetGame])

  return { handleStart, handleReplay }
}

export default useGameControls
