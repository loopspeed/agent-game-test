'use client'
import { useGSAP } from '@gsap/react'
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import React, { type FC, useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, DataTexture, Points, Texture, Vector2 } from 'three'
import { GPUComputationRenderer, type Variable } from 'three/addons/misc/GPUComputationRenderer.js'

import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { GameStage, useGameStore } from '@/stores/GameProvider'

import particleFragment from './points/point.frag'
import particleVertex from './points/point.vert'
import positionFragmentShader from './simulation/position.frag'
import velocityFragmentShader from './simulation/velocity.frag'

type PointsShaderUniforms = {
  uTime: number
  uPositions: Texture | null
  uVelocities: Texture | null
  uDamageAmount: number
  uDpr: number
}

type VelocityShaderUniforms = {
  uIsIdle: { value: boolean }
  uTime: { value: number }
  uDamageAmount: { value: number }
  uSeedTexture: { value: DataTexture | null }
  uPlayerVelocity: { value: Vector2 }
  uTimeMultiplier: { value: number }
}

type PositionShaderUniforms = {
  uIsIdle: { value: boolean }
  uTime: { value: number }
  uDamageAmount: { value: number }
  uTimeMultiplier: { value: number }
}

const INITIAL_POINTS_UNIFORMS: PointsShaderUniforms = {
  uTime: 0,
  uPositions: null,
  uVelocities: null,
  uDamageAmount: 0,
  uDpr: 1,
}

const CustomShaderMaterial = shaderMaterial(INITIAL_POINTS_UNIFORMS, particleVertex, particleFragment)
const FBOPointsShaderMaterial = extend(CustomShaderMaterial)

type Props = {
  isMobile: boolean // on mobile we use fewer particles
  playerVelocity: Vector2 // player movement velocity for particle tail effects
}

export const ORB_RADIUS = 0.25 as const

const PlayerParticles: FC<Props> = ({ isMobile, playerVelocity }) => {
  const dpr = useThree((s) => s.viewport.dpr)
  const performance = useThree((s) => s.performance).current
  const renderer = useThree((s) => s.gl)

  const particlesCount = useMemo(() => Math.pow(isMobile ? 40 : 64 * performance, 2), [isMobile, performance])
  const points = useRef<Points>(null)
  const pointsShaderMaterial = useRef<typeof FBOPointsShaderMaterial & PointsShaderUniforms>(null)
  const textureSize = useMemo(() => Math.sqrt(particlesCount), [particlesCount])

  // GPUComputationRenderer setup
  const gpuCompute = useRef<GPUComputationRenderer | null>(null)
  const velocityVariable = useRef<Variable>(null)
  const positionVariable = useRef<Variable>(null)
  const velocityUniforms = useRef<VelocityShaderUniforms | null>(null)
  const positionUniforms = useRef<PositionShaderUniforms | null>(null)

  // Animation values
  const damageAmount = useRef({ value: 0 })
  const scoreEvents = useGameStore((s) => s.scoreEvents)
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const { totalTime: gameTime, timeMultiplier } = useTimeSubscription()

  useGSAP(() => {
    // Respond to score events for damage "explosion" effect
    if (scoreEvents.length === 0) return
    const latestEvent = scoreEvents.at(-1)
    if (!latestEvent) return

    if (latestEvent.type === 'hit') {
      gsap.to(damageAmount.current, {
        value: 1,
        duration: 0.24,
        ease: 'power1.out',
        onComplete: () => {
          gsap.to(damageAmount.current, {
            value: 0,
            duration: 0.1,
            delay: 0.3,
          })
        },
      })
    }
  }, [scoreEvents])

  // ------------------
  // PARTICLE GEOMETRY SETUP
  // ------------------
  // Use a dummy position attribute because our vertex shader will sample from uPositions.
  const particlesPositions = useMemo(() => {
    return new Float32Array(particlesCount * 3).fill(0)
  }, [particlesCount])

  // Create UVs for the particles (for sampling the simulation texture)
  const { seeds, textureUvs, colours } = useMemo(() => {
    // Allocate single buffer: 1 seed + 2 UVs + 3 teal = 6 floats per particle
    const totalFloats = particlesCount * 6
    const singleBuffer = new Float32Array(totalFloats)

    // Create views into the buffer
    const seeds = singleBuffer.subarray(0, particlesCount)
    const textureUvs = singleBuffer.subarray(particlesCount, particlesCount * 3)
    const colours = singleBuffer.subarray(particlesCount * 3, particlesCount * 6)

    for (let i = 0; i < particlesCount; i++) {
      // Seed
      seeds[i] = Math.random()

      // UV coordinates
      const x = (i % textureSize) / (textureSize - 1)
      const y = Math.floor(i / textureSize) / (textureSize - 1)
      textureUvs[i * 2] = x
      textureUvs[i * 2 + 1] = y

      // Colour
      const i3 = i * 3
      const tealColorIndex = Math.floor(Math.random() * TEAL_PALETTE.length)
      const tealColor = new Color(TEAL_PALETTE[tealColorIndex])
      colours[i3 + 0] = tealColor.r
      colours[i3 + 1] = tealColor.g
      colours[i3 + 2] = tealColor.b
    }

    return { seeds, textureUvs, colours }
  }, [particlesCount, textureSize])

  // ------------------
  // SIMULATION SETUP
  // ------------------
  useLayoutEffect(() => {
    if (!renderer) return

    try {
      // Setup the GPU compute process
      gpuCompute.current = new GPUComputationRenderer(textureSize, textureSize, renderer)

      // Create initial textures
      const dtPosition = gpuCompute.current.createTexture()
      const dtVelocity = gpuCompute.current.createTexture()
      const dtSeed = gpuCompute.current.createTexture()

      // Fill initial textures with sphere positions and seeds
      fillTextures({
        texturePosition: dtPosition,
        textureVelocity: dtVelocity,
        textureSeed: dtSeed,
        seeds,
      })

      // Add variables to GPU compute
      velocityVariable.current = gpuCompute.current.addVariable('textureVelocity', velocityFragmentShader, dtVelocity)
      positionVariable.current = gpuCompute.current.addVariable('texturePosition', positionFragmentShader, dtPosition)

      // Set dependencies (velocity depends on position and velocity, position depends on both)
      gpuCompute.current.setVariableDependencies(velocityVariable.current, [
        positionVariable.current,
        velocityVariable.current,
      ])
      gpuCompute.current.setVariableDependencies(positionVariable.current, [
        positionVariable.current,
        velocityVariable.current,
      ])

      // Set uniforms
      velocityUniforms.current = velocityVariable.current.material.uniforms as VelocityShaderUniforms
      if (velocityUniforms.current) {
        velocityUniforms.current.uIsIdle = { value: true }
        velocityUniforms.current.uTime = { value: 0.0 }
        velocityUniforms.current.uDamageAmount = { value: 0.0 }
        velocityUniforms.current.uSeedTexture = { value: dtSeed }
        velocityUniforms.current.uPlayerVelocity = { value: new Vector2(0, 0) }
        velocityUniforms.current.uTimeMultiplier = { value: 1.0 }
      }

      const positionUniformsTemp = positionVariable.current.material.uniforms as PositionShaderUniforms
      positionUniforms.current = positionUniformsTemp
      if (positionUniformsTemp) {
        positionUniformsTemp.uIsIdle = { value: true }
        positionUniformsTemp.uTime = { value: 0.0 }
        positionUniformsTemp.uDamageAmount = { value: 0.0 }
        positionUniformsTemp.uTimeMultiplier = { value: 1.0 }
      }

      // Initialize GPU compute
      const error = gpuCompute.current.init()
      if (error !== null) throw new Error(error)
    } catch (error) {
      console.error('Error initializing GPUComputationRenderer:', error)
    }
  }, [renderer, textureSize, seeds])

  useFrame(({ clock }) => {
    if (
      !pointsShaderMaterial.current ||
      !gpuCompute.current ||
      !velocityUniforms.current ||
      !positionUniforms.current ||
      !positionVariable.current ||
      !velocityVariable.current
    )
      return

    const time = gameTime.current
    // Update uniforms
    velocityUniforms.current.uIsIdle.value = !isPlaying
    velocityUniforms.current.uTime.value = time
    velocityUniforms.current.uDamageAmount.value = damageAmount.current.value
    velocityUniforms.current.uPlayerVelocity.value.copy(playerVelocity)
    velocityUniforms.current.uTimeMultiplier.value = timeMultiplier.current

    // Update position uniforms
    positionUniforms.current.uIsIdle.value = !isPlaying
    positionUniforms.current.uTime.value = time
    positionUniforms.current.uDamageAmount.value = damageAmount.current.value
    positionUniforms.current.uTimeMultiplier.value = timeMultiplier.current

    // Compute the simulation
    gpuCompute.current.compute()

    // Set the result textures to the points material
    pointsShaderMaterial.current.uTime = time
    pointsShaderMaterial.current.uPositions = gpuCompute.current.getCurrentRenderTarget(
      positionVariable.current,
    ).texture
    pointsShaderMaterial.current.uVelocities = gpuCompute.current.getCurrentRenderTarget(
      velocityVariable.current,
    ).texture
    pointsShaderMaterial.current.uDamageAmount = damageAmount.current.value
  })

  return (
    <points ref={points} dispose={null} frustumCulled={false} renderOrder={1}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          args={[particlesPositions, 3]}
          count={particlesPositions.length / 3}
          itemSize={3}
        />
        <bufferAttribute attach="attributes-uv" args={[textureUvs, 2]} count={textureUvs.length / 2} />
        <bufferAttribute attach="attributes-seed" args={[seeds, 1]} count={seeds.length} />
        <bufferAttribute attach="attributes-color" args={[colours, 3]} count={colours.length / 3} />
      </bufferGeometry>

      <FBOPointsShaderMaterial
        key={CustomShaderMaterial.key}
        ref={pointsShaderMaterial}
        transparent={true}
        depthTest={false}
        blending={AdditiveBlending}
        {...INITIAL_POINTS_UNIFORMS}
        uDpr={dpr}
      />
    </points>
  )
}

export default PlayerParticles

// Helper function to fill textures with initial particle data
const fillTextures = ({
  texturePosition,
  textureVelocity,
  textureSeed,
  seeds,
}: {
  texturePosition: DataTexture
  textureVelocity: DataTexture
  textureSeed: DataTexture
  seeds: Float32Array
}) => {
  const posArray = texturePosition.image.data as Float32Array
  const velArray = textureVelocity.image.data as Float32Array
  const seedArray = textureSeed.image.data as Float32Array

  for (let k = 0, kl = posArray.length; k < kl; k += 4) {
    const particleIndex = k / 4

    // Generate random position on sphere (radius 0.3, similar to player size)
    const u = Math.random() * 2 - 1 // random value in [-1, 1]
    const phi = Math.random() * 2 * Math.PI // random angle in [0, 2π]
    const radius = ORB_RADIUS

    // Convert spherical coordinates to Cartesian coordinates
    const sqrtOneMinusU2 = Math.sqrt(1 - u * u)
    const x = sqrtOneMinusU2 * Math.cos(phi) * radius
    const y = sqrtOneMinusU2 * Math.sin(phi) * radius
    const z = u * radius

    // Position
    posArray[k + 0] = x
    posArray[k + 1] = y
    posArray[k + 2] = z
    posArray[k + 3] = 1.0

    // Initial velocity and life - particles start moving toward camera
    velArray[k + 0] = (Math.random() - 0.5) * 0.5 // Small X variation
    velArray[k + 1] = (Math.random() - 0.5) * 0.5 // Small Y variation
    velArray[k + 2] = 2.0 + Math.random() * 1.0 // Initial movement toward camera (positive Z)
    velArray[k + 3] = Math.random() // Random life between 0.0 and 1.0

    // Seed data - use the seed from the seeds array
    const seed = particleIndex < seeds.length ? seeds[particleIndex] : Math.random()
    seedArray[k + 0] = seed
    seedArray[k + 1] = 0.0
    seedArray[k + 2] = 0.0
    seedArray[k + 3] = 1.0
  }

  texturePosition.needsUpdate = true
  textureVelocity.needsUpdate = true
  textureSeed.needsUpdate = true
}

const TEAL_PALETTE = [
  '#00fcdf', // 0
  '#00f0d0', // 1
  '#00ffff', // 2
  '#00ffff', // 3
  '#00ecdc', // 4
  '#00ffe2', // 5
  '#00fff5', // 6
  '#00ffff', // 7
  '#00fff1', // 8
  '#00ffff', // 9
  '#00ffff', // 10
  '#00fffa', // 11
  '#00f2d5', // 12
  '#00fff1', // 13
  '#00ffff', // 14
  '#00fff9', // 15
  '#00eec7', // 16
  '#00ffdd', // 17
  '#00fffd', // 18
  '#00fffb', // 19
  '#caeae6', // 20
  '#d6f1f2', // 21
  '#e8f6f5', // 22
  '#d8fcf9', // 23
  '#d9fef4', // 24
  '#d7e6e7', // 25
  '#e4fffc', // 26
  '#d0e8e4', // 27
  '#c1efeb', // 28
  '#d7ffff', // 29
  '#3f918d', // 30
  '#3f8985', // 31
  '#52b1a8', // 32
  '#5ca598', // 33
  '#005b4e', // 34
  '#005449', // 35
  '#5aa39a', // 36
  '#56aaa3', // 37
  '#46978e', // 38
  '#42a99f', // 39
]
