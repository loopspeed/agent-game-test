'use client'
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
import Tunnel from './tunnel/Tunnel'
import TunnelParticles from './tunnelParticles/TunnelParticles'

const LevelScene: FC = () => {
  const update = useLevelStore((s) => s.update)
  const { totalTime, timeMultiplier } = useTimeSubscription()

  useFrame((_, delta) => {
    const newTime = totalTime.current + delta * timeMultiplier.current
    update(newTime)
  })

  return (
    <>
      <Suspense fallback={null}>
        <ambientLight intensity={2} />
        <fog attach="fog" args={['#000', Math.abs(SPAWN_OBSTACLE_Z) - 5, Math.abs(SPAWN_OBSTACLE_Z) - 1]} />
        <Tunnel />
        <TunnelParticles isMobile={false} />
        {/* Physics world with zero gravity (kinematic bodies only) */}
        <Physics gravity={[0, 0, 0]} debug={false}>
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
