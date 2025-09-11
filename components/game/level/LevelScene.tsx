'use client'
import { useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useControls } from 'leva'
import { type FC, Suspense } from 'react'

import Player from '@/components/game/Player'
import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { SPAWN_OBSTACLE_Z } from '@/stores/GameProvider'
import { useLevelStore } from '@/stores/LevelProvider'

import AnswerGates from './AnswerGates'
import Obstacles from './Obstacles'

const LevelScene: FC = () => {
  const update = useLevelStore((s) => s.update)
  const { gameTime, timeMultiplier } = useTimeSubscription()

  // Physics debug controls
  const { physicsDebug } = useControls('Physics Debug', {
    physicsDebug: {
      label: 'Show Physics Debug',
      value: false,
    },
  })

  useFrame((_, delta) => {
    const newTime = gameTime.current + delta * timeMultiplier.current
    update(newTime)
  })

  return (
    <Suspense fallback={null}>
      {/* Physics world with zero gravity (kinematic bodies only) */}
      <Physics gravity={[0, 0, 0]} debug={physicsDebug}>
        <ambientLight intensity={2} />
        <fog attach="fog" args={['#000000', Math.abs(SPAWN_OBSTACLE_Z) - 5, Math.abs(SPAWN_OBSTACLE_Z) - 1]} />
        <Obstacles />
        <AnswerGates />
        <Player />
      </Physics>
    </Suspense>
  )
}

export default LevelScene
