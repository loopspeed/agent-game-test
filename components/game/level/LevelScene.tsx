'use client'
import { Environment, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { type FC, Suspense } from 'react'

import Player from '@/components/game/Player'
import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { SPAWN_OBSTACLE_Z } from '@/stores/GameProvider'
import { useLevelStore } from '@/stores/LevelProvider'

import AnswerGates from './AnswerGates'
import Obstacles from './Obstacles'
import Onboarding from './Onboarding'
import Outro from './Outro'

const LevelScene: FC = () => {
  const update = useLevelStore((s) => s.update)
  const { gameTime, timeMultiplier } = useTimeSubscription()

  // const envMap = useTexture('/environments/venice_sunset_1k.hdr')

  useFrame((_, delta) => {
    const newTime = gameTime.current + delta * timeMultiplier.current
    update(newTime)
  })

  return (
    <>
      <Suspense fallback={null}>
        {/* <Environment files={['/environment/rosendal_park_sunset_puresky_2k.hdr']} background={true} /> */}
        <ambientLight intensity={2} />
        <fog attach="fog" args={['#000000', Math.abs(SPAWN_OBSTACLE_Z) - 5, Math.abs(SPAWN_OBSTACLE_Z) - 1]} />
        {/* Physics world with zero gravity (kinematic bodies only) */}
        <Physics gravity={[0, 0, 0]} debug={true}>
          <Obstacles />
          <AnswerGates />
          <Onboarding />
          <Outro />
          <Player />
        </Physics>
      </Suspense>
    </>
  )
}

export default LevelScene
