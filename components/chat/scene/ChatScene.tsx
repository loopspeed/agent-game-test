'use client'
import { Canvas } from '@react-three/fiber'
import { type FC, Suspense, useRef } from 'react'
import * as THREE from 'three'

import PlayerParticles from '@/components/player/particles/PlayerParticles'

const ChatCanvas: FC = () => {
  return (
    <Canvas
      id="chat-canvas"
      className="!fixed inset-0 !h-lvh"
      performance={{ min: 0.2, debounce: 300 }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: 'low-power',
      }}
      camera={{ position: [0, 0, 4], fov: 70, far: 20 }}>
      <color attach="background" args={['grey']} />
      <ChatScene />
    </Canvas>
  )
}

const ChatScene: FC = () => {
  const playerVelocity = useRef(new THREE.Vector2(0, 0))

  return (
    <Suspense fallback={null}>
      <ambientLight intensity={2} />

      <group position={[2, -1, 0]}>
        <PlayerParticles
          isPlaying={false}
          isMobile={false}
          timeMultiplier={{ current: 1 }}
          scoreEvents={[]}
          movementVelocity={playerVelocity.current}
        />
      </group>
    </Suspense>
  )
}

export default ChatCanvas
