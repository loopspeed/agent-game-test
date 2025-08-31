'use client'

import { type FC, useEffect } from 'react'

import { GameStage, MAX_HEALTH, useGameStore } from '@/stores/GameProvider'

const HUD: FC = () => {
  return (
    <div className="pointer-events-none fixed top-0 z-50 flex !h-svh w-full items-center justify-center">
      <Health />

      <ReadyButton />
      <SlowMoCountdown />
      {/* Future HUD elements can be added here */}
      {/* Top right - Score, level, etc. */}
      {/* Bottom center - Instructions or current question */}
      {/* Bottom right - Additional info */}
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

const SlowMoCountdown: FC = () => {
  return (
    <div className="absolute top-4 h-3 w-64 overflow-hidden rounded-full bg-white/20">
      <div id="slow-mo-bar" className="absolute h-full w-full origin-left bg-blue-500 opacity-0" />
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
