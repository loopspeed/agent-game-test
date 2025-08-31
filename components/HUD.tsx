'use client'

import { type FC, useEffect } from 'react'

import { GameStage, MAX_HEALTH, useGameStore } from '@/stores/GameProvider'

const HUD: FC = () => {
  return (
    <div className="pointer-events-none fixed top-0 z-50 flex !h-svh w-full items-center justify-center">
      <Health />

      <ReadyButton />

      <Question />
    </div>
  )
}

export default HUD

const ReadyButton: FC = () => {
  const stage = useGameStore((s) => s.stage)
  const setStage = useGameStore((s) => s.setStage)

  useEffect(() => {
    if (stage !== GameStage.INTRO) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        setStage(GameStage.PLAYING)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [setStage, stage])

  if (stage !== GameStage.INTRO) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <button className="pointer-events-auto bg-white p-8 text-black" onClick={() => setStage(GameStage.PLAYING)}>
        READY (ENTER)
      </button>
    </div>
  )
}

const Health: FC = () => {
  const stage = useGameStore((s) => s.stage)
  const health = useGameStore((s) => s.health)

  const showHealth = stage === GameStage.PLAYING
  if (!showHealth) return null

  return (
    <div className="absolute bottom-4 flex items-center gap-2">
      <span className="text-sm font-medium">Health</span>
      <div className="flex gap-1">
        {Array.from({ length: MAX_HEALTH }, (_, i) => (
          <div key={i} className={`size-3 rounded-full ${i < health ? 'bg-red-500' : 'bg-white/40'}`} />
        ))}
      </div>
    </div>
  )
}

const Question: FC = () => {
  const currentQuestion = useGameStore((s) => s.currentQuestion)
  const questionId = currentQuestion.id

  return (
    <div className="absolute top-0 flex max-w-lg flex-col gap-3 bg-black/70 p-5 text-center text-3xl leading-relaxed font-bold">
      <span>{currentQuestion.question}</span>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/20">
        <div id="slow-mo-bar" className="absolute h-full w-full origin-left bg-blue-500 opacity-0" />
      </div>
    </div>
  )
}
