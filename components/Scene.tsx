'use client'
import { type FC } from 'react'
import Player from './Player'
import AnswerGates from './AnswerGates'
import * as THREE from 'three'
import { GRID_SQUARE_SIZE_M } from '@/stores/useGameStore'
import Obstacles from '@/components/Obstacles'

const Scene: FC = () => {
  // Example of reading player position
  // const playerPosition = useRef(useWorldStore.getState().playerPosition) // Fetch initial state
  // useEffect(() => useWorldStore.subscribe((state) => (playerPosition.current = state.playerPosition)), []) // Subscribe to state changes

  return (
    <>
      <ambientLight intensity={2} />
      <directionalLight position={[5, 10, 7.5]} intensity={1} />

      <Obstacles />

      <AnswerGates />

      <Player />

      <gridHelper
        args={[GRID_SQUARE_SIZE_M * 3, 3]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        material={new THREE.LineBasicMaterial({ color: 0x555555 })}
      />
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
