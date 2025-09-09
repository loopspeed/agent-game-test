'use client'
import { type FC } from 'react'

import { useLevelStore } from '@/stores/LevelProvider'

const DebugDisplay: FC = () => {
  useLevelStore((s) => s.gameTime) // used to trigger re-renders
  const getDebugInfo = useLevelStore((s) => s.getDebugInfo)
  const debugInfo = getDebugInfo()

  return (
    <div className="fixed top-10 left-10 max-w-md bg-black py-10 text-white/70">
      <p className="leading-loose">
        Game Time (s): <span className="text-white">{debugInfo.gameTime.toFixed(2)}</span>
        <hr />
        Phase: <span className="text-lg text-white">{debugInfo.phase}</span>
        <br />
        Phase Time (s): <span className="text-white">{debugInfo.phaseTime.toFixed(2)}</span>
        <hr />
        Question Index: <span className="text-yellow-300">{debugInfo.questionIndex}</span>
        <br />
        Current Question: <span className="text-yellow-300">{debugInfo.question?.question || 'N/A'}</span>
      </p>
    </div>
  )
}

export default DebugDisplay
