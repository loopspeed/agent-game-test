'use client'

import { ScreenQuad, shaderMaterial } from '@react-three/drei'
import { createPortal, extend } from '@react-three/fiber'
import React, { forwardRef, memo } from 'react'
import { DataTexture, FloatType, RGBAFormat, Scene } from 'three'

import simulationFragment from './simulation.frag'
import simulationVertex from './simulation.vert'

type SimulationUniforms = {
  uTime: number
  uScatteredPositions: DataTexture | null
  uSpherePositions: DataTexture | null
  uSeedTexture: DataTexture | null
  uScatteredAmount: number
}

const INITIAL_UNIFORMS: SimulationUniforms = {
  uTime: 0,
  uScatteredPositions: null,
  uSpherePositions: null,
  uSeedTexture: null,
  uScatteredAmount: 1,
}

const CustomShaderMaterial = shaderMaterial(INITIAL_UNIFORMS, simulationVertex, simulationFragment)
const SimulationShaderMaterial = extend(CustomShaderMaterial)

type Props = {
  particlesCount: number
  textureSize: number
  fboScene: Scene
  seeds: Float32Array
}

export type SimulationShaderRef = typeof SimulationShaderMaterial & SimulationUniforms

const FBOPointsSimulation = forwardRef<SimulationShaderRef, Props>(
  ({ particlesCount, textureSize, fboScene, seeds }, ref) => {
    // Off-screen simulation material
    return (
      <>
        {createPortal(
          <ScreenQuad>
            <SimulationShaderMaterial
              key={CustomShaderMaterial.key}
              ref={ref}
              {...INITIAL_UNIFORMS}
              onBeforeCompile={(shader) => {
                if (!shader) return

                // Create scattered positions (larger sphere)
                const scatteredPositions = createDataTextureFromPositions(
                  getSpherePositions({
                    count: particlesCount,
                    radius: 2.0, // Larger sphere for scattered positions
                    offset: { x: 0, y: 0, z: 0 },
                  }),
                  textureSize,
                )

                // Create sphere positions (small sphere like player)
                const spherePositions = createDataTextureFromPositions(
                  getSpherePositions({
                    count: particlesCount,
                    radius: 0.3, // Small sphere similar to player size (0.24)
                    offset: { x: 0, y: 0, z: 0 },
                  }),
                  textureSize,
                )

                const seedTexture = createDataTextureFromSeeds(seeds, textureSize)

                shader.uniforms.uScatteredPositions = {
                  value: scatteredPositions as SimulationUniforms['uScatteredPositions'],
                }
                shader.uniforms.uSpherePositions = {
                  value: spherePositions as SimulationUniforms['uSpherePositions'],
                }
                shader.uniforms.uSeedTexture = {
                  value: seedTexture as SimulationUniforms['uSeedTexture'],
                }
              }}
            />
          </ScreenQuad>,
          fboScene,
        )}
      </>
    )
  },
)

FBOPointsSimulation.displayName = 'FBOPointsSimulation'

const createDataTextureFromSeeds = (seeds: Float32Array, textureSize: number): DataTexture => {
  const expectedLength = textureSize * textureSize * 4
  const data = new Float32Array(expectedLength)
  // Fill with each seed in the red channel, others are set to 0 (alpha = 1)
  for (let i = 0; i < textureSize * textureSize; i++) {
    data[i * 4] = seeds[i] !== undefined ? seeds[i] : 0
    data[i * 4 + 1] = 0
    data[i * 4 + 2] = 0
    data[i * 4 + 3] = 1
  }
  const dt = new DataTexture(data, textureSize, textureSize, RGBAFormat, FloatType)
  dt.needsUpdate = true
  return dt
}

const createDataTextureFromPositions = (positions: Float32Array, textureSize: number): DataTexture => {
  const expectedLength = textureSize * textureSize * 4
  if (positions.length !== expectedLength) {
    const padded = new Float32Array(expectedLength)
    padded.set(positions)
    positions = padded
  }
  const dt = new DataTexture(positions, textureSize, textureSize, RGBAFormat, FloatType)
  dt.needsUpdate = true
  return dt
}

const getSpherePositions = ({
  count,
  radius,
  offset,
}: {
  count: number
  radius: number
  offset: { x: number; y: number; z: number }
}): Float32Array => {
  const positions = new Float32Array(count * 4)

  for (let i = 0; i < count; i++) {
    // Uniformly sample a point on the sphere
    const u = Math.random() * 2 - 1 // random value in [-1, 1]
    const phi = Math.random() * 2 * Math.PI // random angle in [0, 2π]

    // Convert spherical coordinates to Cartesian coordinates
    const sqrtOneMinusU2 = Math.sqrt(1 - u * u)
    const x = sqrtOneMinusU2 * Math.cos(phi) * radius + offset.x
    const y = sqrtOneMinusU2 * Math.sin(phi) * radius + offset.y
    const z = u * radius + offset.z
    const a = 1.0

    positions.set([x, y, z, a], i * 4)
  }

  return positions
}

export default memo(FBOPointsSimulation)
