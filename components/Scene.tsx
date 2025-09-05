'use client'
import { type FC } from 'react'
import * as THREE from 'three'

import AnswerGates from '@/components/AnswerGates'
import { BeamObstacles, SphereObstacles } from '@/components/Obstacles'
import Player from '@/components/Player'
import { GRID_SQUARE_SIZE_M, LANES_Y_OFFSET, SPAWN_OBSTACLE_Z } from '@/stores/GameProvider'

const Scene: FC = () => {
  // Example of reading player position
  // const playerPosition = useRef(useWorldStore.getState().playerPosition) // Fetch initial state
  // useEffect(() => useWorldStore.subscribe((state) => (playerPosition.current = state.playerPosition)), []) // Subscribe to state changes

  return (
    <>
      <ambientLight intensity={2} />

      <fog attach="fog" args={['#000000', Math.abs(SPAWN_OBSTACLE_Z) - 5, Math.abs(SPAWN_OBSTACLE_Z) - 1]} />

      <BeamObstacles />
      <SphereObstacles />

      {/* World conveyor (−Z translation, spacing, killZ, pooling) */}
      {/* I like the idea of a World Conveyor that manages the planning and generation of obstacles */}
      <AnswerGates />

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

// useFrame(({ camera }) => {
//   const [px, py, pz] = playerPosition.current
//   const offset = new THREE.Vector3(0, 1, 4)
//   const target = new THREE.Vector3(px, py, pz)
//   const desiredPos = target.clone().add(offset)
//   // interpolation factor; higher = snappier
//   camera.position.lerp(desiredPos, 0.75)
//   camera.lookAt(target)
// })
