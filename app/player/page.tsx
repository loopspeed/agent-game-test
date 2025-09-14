'use client'
import { Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import React from 'react'

import { CAMERA_FAR } from '@/stores/GameProvider'

// TODO: a page for testing the player movement and customisation..
function PlayerPage() {
  return (
    <Canvas
      className="!fixed inset-0 !h-lvh"
      performance={{ min: 0.2, debounce: 300 }}
      gl={{
        antialias: false,
        alpha: false,
      }}
      camera={{ position: [0, 0.2, 4], fov: 75, far: CAMERA_FAR }}>
      <Stats />
    </Canvas>
  )
}

export default PlayerPage
