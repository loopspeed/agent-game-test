'use client'
import { type FC } from 'react'

import { useLevelStore } from '@/stores/LevelProvider'
import { useLevelConfigStore } from '@/stores/useLevelConfigStore'

const DebugDisplay: FC = () => {
  useLevelStore((s) => s.totalTime) // used to trigger re-renders
  const debugInfo = useLevelStore((s) => s.getDebugInfo)()
  const phaseDurations = useLevelConfigStore((s) => s.phaseDurations)

  return (
    <div className="fixed top-4 left-4 max-w-md bg-black py-10 text-xs leading-loose text-white/70">
      Game Time (s): <span className="text-white">{debugInfo.gameTime.toFixed(2)}</span>
      <hr />
      Phase: <span className="text-white">{debugInfo.phase}</span>
      <br />
      Phase Time (s):{' '}
      <span className="text-white">
        {debugInfo.phaseTime.toFixed(2)} / {phaseDurations[debugInfo.phase]}
      </span>
      <hr />
      Question Index: <span className="text-white">{debugInfo.questionIndex}</span>
    </div>
  )
}

export default DebugDisplay
