'use client'
import { Environment } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { type FC, Suspense } from 'react'

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
      camera={{ position: [0, 0, 5], fov: 70, far: 20 }}>
      <color attach="background" args={['blue']} />
      <ChatScene />
    </Canvas>
  )
}

const ChatScene: FC = () => {
  return (
    <Suspense fallback={null}>
      <ambientLight intensity={2} />
    </Suspense>
  )
}

export default ChatCanvas
