import { useFrame } from '@react-three/fiber'
import React, { type FC } from 'react'

import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { useLevelStore } from '@/stores/LevelProvider'

import AnswerGates from './AnswerGates'
import Obstacles from './Obstacles'

const WorldConveyor: FC = () => {
  const update = useLevelStore((s) => s.update)
  const { gameTime, timeMultiplier } = useTimeSubscription()

  useFrame((_, delta) => {
    const newTime = gameTime.current + delta * timeMultiplier.current
    update(newTime)
  })

  return (
    <>
      <Obstacles />
      <AnswerGates />
    </>
  )
}

export default WorldConveyor
