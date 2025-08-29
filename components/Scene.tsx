'use client'
import { useFrame, useThree } from '@react-three/fiber'
import type { FC } from 'react'
import Player from './Player'
import * as THREE from 'three'
import { useWorldStore } from '@/stores/worldStore'
import Obstacles from '@/components/Obstacles'

const Scene: FC = () => {
  // Update world motion each frame if needed
  useFrame(() => {
    // Placeholder for world update logic (move rings, check despawn)
  })

  /* GRID LINES */
  const lanesX = useWorldStore((state) => state.laneX || [-1, 0, 1])
  const lanesY = useWorldStore((state) => state.laneY || [-1, 0, 1])

  // Assuming symmetrical lanes, the playable width is (last – first)
  const gridSizeX = Math.abs(lanesX[lanesX.length - 1] - lanesX[0])
  const gridSizeY = Math.abs(lanesY[lanesY.length - 1] - lanesY[0])

  // Number of divisions is one less than number of lanes
  const divisionsX = lanesX.length - 1
  const divisionsY = lanesY.length - 1

  // Use the larger dimension for a square grid
  const gridSize = Math.max(gridSizeX, gridSizeY)
  const divisions = Math.max(divisionsX, divisionsY)

  const { camera } = useThree()
  const playerPosition = useWorldStore((state) => state.playerPosition)

  // useFrame(() => {
  // const [px, py, pz] = playerPosition;
  // const offset = new THREE.Vector3(0, 1, 4);
  // const target = new THREE.Vector3(px, py, pz);
  // const desiredPos = target.clone().add(offset);
  // // interpolation factor; higher = snappier
  // camera.position.lerp(desiredPos, 0.75);
  // camera.lookAt(target);
  // })

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 7.5]} intensity={1} />

      <Player />

      <Obstacles />

      <gridHelper
        args={[gridSize, divisions]}
        rotation={[Math.PI / 2.25, 0, 0]}
        position={[0, 0, 0]}
        material={new THREE.LineBasicMaterial({ color: 0x555555 })}
      />
    </>
  )
}

export default Scene
