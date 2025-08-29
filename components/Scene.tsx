'use client'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, type FC } from 'react'
import Player from './Player'
import * as THREE from 'three'
import { GRID_SCALE, useWorldStore } from '@/stores/worldStore'
import Obstacles from '@/components/Obstacles'

const Scene: FC = () => {
  const playerPosition = useRef(useWorldStore.getState().playerPosition) // Fetch initial state
  useEffect(() => useWorldStore.subscribe((state) => (playerPosition.current = state.playerPosition)), []) // Subscribe to state changes

  // useFrame(({ camera }) => {
  //   const [px, py, pz] = playerPosition.current
  //   const offset = new THREE.Vector3(0, 1, 4)
  //   const target = new THREE.Vector3(px, py, pz)
  //   const desiredPos = target.clone().add(offset)
  //   // interpolation factor; higher = snappier
  //   camera.position.lerp(desiredPos, 0.75)
  //   camera.lookAt(target)
  // })

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 7.5]} intensity={1} />

      <Player />

      <Obstacles />

      <gridHelper
        args={[GRID_SCALE * 3, 3]}
        rotation={[Math.PI / 2.25, 0, 0]}
        position={[0, 0, 0]}
        material={new THREE.LineBasicMaterial({ color: 0x555555 })}
      />
    </>
  )
}

export default Scene
