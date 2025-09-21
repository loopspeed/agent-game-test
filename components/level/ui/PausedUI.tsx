'use client'

import { type FC } from 'react'
import { type TransitionStatus } from 'react-transition-group'

import { useLevelStore } from '@/stores/LevelProvider'

type Props = {
  transitionStatus: TransitionStatus
  onExit: () => void
}

const PausedUI: FC<Props> = ({ onExit }) => {
  const resume = useLevelStore((s) => s.resume)

  const handleContinue = () => {
    resume()
  }

  const handleExit = () => {
    onExit()
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 bg-black/80 p-8 text-white">
      <h2 className="text-2xl font-bold">Game Paused</h2>

      <div className="flex gap-4">
        <button
          onClick={handleContinue}
          className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700">
          Continue
        </button>

        <button
          onClick={handleExit}
          className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700">
          Exit
        </button>
      </div>
    </div>
  )
}

export default PausedUI
