'use client'

import { type FC, useEffect } from 'react'

// import DebugDisplay from '@/components/debug/DebugDisplay'
import LevelCanvas from '@/components/game/level/LevelCanvas'
import GameUI from '@/components/ui/GameUI'
import { useKeypadInput } from '@/hooks/useKeypadInput'
import { GameProvider, useGameStore } from '@/stores/GameProvider'
import { useLevelStore } from '@/stores/LevelProvider'

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
    <GameProvider>
      <GameContent />
    </GameProvider>
  )
}
