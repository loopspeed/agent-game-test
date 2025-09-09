'use client'
import { type FC } from 'react'

import { useWorldStore } from '@/stores/WorldProvider'

const DebugDisplay: FC = () => {
  useWorldStore((s) => s.gameTime) // used to trigger re-renders
  const getDebugInfo = useWorldStore((s) => s.getDebugInfo)
  const debugInfo = getDebugInfo()

  return (
    <div className="fixed top-0 left-0 max-w-md bg-black p-8 text-white/70">
      <p className="">
        Game Time (s): <span className="text-white">{debugInfo.gameTime.toFixed(2)}</span>
        <hr />
        Phase: <span className="text-white">{debugInfo.phase}</span>
        <br />
        Phase Time (s): <span className="text-white">{debugInfo.phaseTime.toFixed(2)}</span>
        <br />
        Next Phase: <span className="text-yellow-300">{debugInfo.nextPhase ? debugInfo.nextPhase : 'N/A'}</span>
        <hr />
        Question Index: <span className="text-yellow-300">{debugInfo.questionIndex}</span>
        <br />
        Current Question: <span className="text-yellow-300">{debugInfo.question?.question || 'N/A'}</span>
      </p>
    </div>
  )
}

export default DebugDisplay
