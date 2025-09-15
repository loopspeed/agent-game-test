'use client'
import { useFrame } from '@react-three/fiber'
import { type FC, useMemo } from 'react'
import * as THREE from 'three'

import fragmentShader from '@/components/game/progress/terrain.frag'
import vertexShader from '@/components/game/progress/terrain.vert'

// Hexagon grid configuration constants
export const HEX_SIZE = 8.0
export const NOISE_SCALE = 0.0
export const NOISE_AMP = 0.0
export const GRID_LINE_THICKNESS = 1.25 // Increased for better visibility
export const GRID_GLOW_INTENSITY = 3.0 // Increased for better visibility
export const GROUND_HEIGHT = 0

export type TerrainProps = {
  size?: number
  segments?: number
  gridColor?: string
}

const Terrain: FC<TerrainProps> = ({ size = 1000, segments = 30, gridColor = '#ffffff' }) => {
  const hexagonGridMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uHexSize: { value: HEX_SIZE },
        uLineThickness: { value: GRID_LINE_THICKNESS },
        uNoiseScale: { value: NOISE_SCALE },
        uNoiseAmp: { value: NOISE_AMP },
        uGlow: { value: GRID_GLOW_INTENSITY },
        uGridColor: { value: new THREE.Color(gridColor) },
      },
      side: THREE.DoubleSide,
    })
  }, [gridColor])

  useFrame((_, deltaTime) => {
    hexagonGridMaterial.uniforms.uTime.value += deltaTime
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_HEIGHT, 0]} frustumCulled={false}>
      <planeGeometry args={[size, size, segments, segments]} />
      <primitive object={hexagonGridMaterial} attach="material" />
    </mesh>
  )
}

export default Terrain
