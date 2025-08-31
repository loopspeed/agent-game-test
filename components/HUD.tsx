'use client'

import { type FC, useEffect } from 'react'

import { GameStage, MAX_HEALTH, useGameStore } from '@/stores/GameProvider'

const HUD: FC = () => {
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

export default HUD

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

const PlayingUI: FC = () => {
  return (
    <>
      <Question />
      <Health />
    </>
  )
}

const Health: FC = () => {
  const health = useGameStore((s) => s.health)

  // Determine health bar color based on current health level
  const getHealthColor = (): string => {
    if (health >= 4) return 'bg-green-500' // High health (4-5)
    if (health === 3) return 'bg-amber-500' // Medium health (3)
    return 'bg-red-700' // Low health (1-2)
  }

  return (
    <div className="absolute bottom-6 flex gap-0.5 overflow-hidden rounded-full">
      {Array.from({ length: MAX_HEALTH }, (_, i) => (
        <div key={i} className={`h-4 w-6 ${i < health ? getHealthColor() : 'bg-white/30'}`} />
      ))}
    </div>
  )
}

const Question: FC = () => {
  const questionIndex = useGameStore((s) => s.currentQuestionIndex)
  const currentQuestion = useGameStore((s) => s.currentQuestion)

  return (
    // TODO: SwitchTransition on the question text
    <div className="absolute top-0 flex max-w-2xl flex-col bg-black/70 text-center text-3xl leading-relaxed font-bold">
      <p className="px-2 py-5">
        {questionIndex + 1}. {currentQuestion.question}
      </p>

      <div className="relative h-2 w-full overflow-hidden bg-white/20">
        <div id="slow-mo-bar" className="absolute h-full w-full origin-left bg-blue-500 opacity-0" />
      </div>
    </div>
  )
}

const GameOverUI: FC = () => {
  return (
    <div className="flex max-w-2xl flex-col bg-black text-center text-3xl leading-relaxed font-bold">
      <p className="px-2 py-5">Game Over</p>
    </div>
  )
}
