'use client'
import { type FC } from 'react'

import Player from '@/components/game/Player'
import { SPAWN_OBSTACLE_Z } from '@/stores/GameProvider'

import WorldConveyor from './world/WorldConveyor'

const Scene: FC = () => {
  return (
    <>
      <ambientLight intensity={2} />
      <fog attach="fog" args={['#000000', Math.abs(SPAWN_OBSTACLE_Z) - 5, Math.abs(SPAWN_OBSTACLE_Z) - 1]} />
      <WorldConveyor />
      <Player />
    </>
  )
}

export default Scene
