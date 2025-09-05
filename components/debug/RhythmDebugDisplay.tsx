'use client'
import { type FC } from 'react'

import { GameStage, useGameStore } from '@/stores/GameProvider'
import { useWorldStore } from '@/stores/WorldProvider'

const DebugDisplay: FC = () => {
  useWorldStore((s) => s.gameTime) // used to trigger re-renders
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const getDebugInfo = useWorldStore((s) => s.getDebugInfo)
  // const getNextAnswerGateForUI = useWorldStore((s) => s.getNextAnswerGateForUI)

  if (!isPlaying) return null

  const debugInfo = getDebugInfo()

  return (
    <div className="fixed top-0 left-0 max-w-md bg-black p-8 text-sm text-white">
      <p className="text-sm">
        Game Time (s): <span className="text-yellow-300">{debugInfo.gameTime.toFixed(2)}</span>
        <br />
        Phase: <span className="text-yellow-300">{debugInfo.phase}</span>
        <br />
        Phase Time (s): <span className="text-yellow-300">{debugInfo.phaseTime.toFixed(2)}</span>
        <br />
        Next Phase: <span className="text-yellow-300">{debugInfo.nextPhase ? debugInfo.nextPhase : 'N/A'}</span>
        <br />
        Question Index: <span className="text-yellow-300">{debugInfo.questionIndex}</span>
        <br />
        Current Question: <span className="text-yellow-300">{debugInfo.question?.question || 'N/A'}</span>
      </p>
    </div>
  )
}

export default DebugDisplay
