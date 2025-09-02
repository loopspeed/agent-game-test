'use client'

import { type FC, useEffect } from 'react'

import { GameStage, useGameStore } from '@/stores/GameProvider'

import GameOverUI from './GameOver'
import PlayingUI from './PlayingUI'

const GameUI: FC = () => {
  const stage = useGameStore((s) => s.stage)

  // TODO:
  // Use a SwitchTransition to mount them
  return (
    <div className="pointer-events-none fixed top-0 z-100 flex !h-svh w-full items-center justify-center">
      {stage === GameStage.INTRO && <IntroUI />}
      {stage === GameStage.PLAYING && <PlayingUI />}
      {stage === GameStage.GAME_OVER && <GameOverUI />}
    </div>
  )
}

export default GameUI

const IntroUI: FC = () => {
  const setStage = useGameStore((s) => s.setStage)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        setStage(GameStage.PLAYING)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [setStage])

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <button
        className="pointer-events-auto bg-black p-8 text-xl font-black text-white"
        onClick={() => setStage(GameStage.PLAYING)}>
        READY (ENTER)
      </button>
    </div>
  )
}
