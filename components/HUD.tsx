'use client'

import { type FC } from 'react'

import { GameStage, MAX_HEALTH, useGameStore } from '@/stores/GameProvider'

const HUD: FC = () => {
  return (
    <div className="pointer-events-none fixed top-0 z-50 flex !h-svh w-full items-center justify-center">
      <Health />

      <ReadyButton />
      <SlowMoBar />
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

  if (stage !== GameStage.INTRO) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <button className="pointer-events-auto bg-white p-8 text-black" onClick={() => setStage(GameStage.PLAYING)}>
        READY
      </button>
    </div>
  )
}

const SlowMoBar: FC = () => {
  return (
    <div className="absolute top-4 h-4 w-40 overflow-hidden rounded-full border">
      <div id="slow-mo-bar" className="absolute h-full w-full origin-left bg-blue-500" />
    </div>
  )
}

const Health: FC = () => {
  const stage = useGameStore((s) => s.stage)
  const health = useGameStore((s) => s.health)

  const showHealth = stage === GameStage.PLAYING
  if (!showHealth) return null

  return (
    <div className="absolute bottom-4 left-4">
      <div className="flex items-center gap-3 rounded-lg bg-black/50 px-4 py-2 text-white backdrop-blur">
        <span className="text-lg font-bold">Health:</span>
        <div className="flex gap-1">
          {Array.from({ length: MAX_HEALTH }, (_, i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-full border ${
                i < health ? 'border-red-400 bg-red-500' : 'border-gray-600 bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
