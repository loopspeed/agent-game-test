'use client'
import { type FC } from 'react'

import Player from '@/components/game/Player'
import { GRID_SQUARE_SIZE_M, LANES_Y_OFFSET, SPAWN_OBSTACLE_Z } from '@/stores/GameProvider'

import WorldConveyor from './world/WorldConveyor'

const Scene: FC = () => {
  return (
    <>
      <ambientLight intensity={2} />
      <fog attach="fog" args={['#000000', Math.abs(SPAWN_OBSTACLE_Z) - 5, Math.abs(SPAWN_OBSTACLE_Z) - 1]} />
      <WorldConveyor />
      <Player />
      {/* <gridHelper
        args={[GRID_SQUARE_SIZE_M * 3, 3]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, LANES_Y_OFFSET, 0]}
        material={new THREE.LineBasicMaterial({ color: 0x555555 })}
      /> */}
    </>
  )
}

export default Scene
