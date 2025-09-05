'use client'

import { type FC } from 'react'

import { MAX_HEALTH, useGameStore } from '@/stores/GameProvider'

const PlayingUI: FC = () => {
  return (
    <>
      <Question />
      <Health />
      <Streak />
    </>
  )
}

export default PlayingUI

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

const Streak: FC = () => {
  const streak = useGameStore((s) => s.currentStreak)

  if (streak <= 0) return null

  return (
    <div className="absolute right-6 bottom-6 rounded-full bg-black/70 px-3 py-1 text-sm font-semibold">
      <span className="mr-1">🔥</span>
      {streak}x
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
