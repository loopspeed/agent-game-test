'use client'
import { useGSAP } from '@gsap/react'
import { shaderMaterial, useFBO } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import React, { type FC, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  FloatType,
  NearestFilter,
  OrthographicCamera,
  Points,
  RGBAFormat,
  Scene,
  Texture,
} from 'three'

import FBOPointsSimulation, { type SimulationShaderRef } from '../simulation/Simulation'
import particleFragment from './point.frag'
import particleVertex from './point.vert'

type PointsShaderUniforms = {
  uTime: number
  uPositions: Texture | null
  uScatteredAmount: number
  uDpr: number
}

const INITIAL_POINTS_UNIFORMS: PointsShaderUniforms = {
  uTime: 0,
  uPositions: null,
  uScatteredAmount: 1,
  uDpr: 1,
}

const CustomShaderMaterial = shaderMaterial(INITIAL_POINTS_UNIFORMS, particleVertex, particleFragment)
const FBOPointsShaderMaterial = extend(CustomShaderMaterial)

type Props = {
  isMobile: boolean // on mobile we use fewer particles
}

const FBOPoints: FC<Props> = ({ isMobile }) => {
  const dpr = useThree((s) => s.viewport.dpr)
  const performance = useThree((s) => s.performance).current
  const particlesCount = useMemo(() => Math.pow(isMobile ? 24 : 40 * performance, 2), [isMobile, performance])
  const points = useRef<Points>(null)
  const pointsShaderMaterial = useRef<typeof FBOPointsShaderMaterial & PointsShaderUniforms>(null)
  const simulationShaderMaterial = useRef<SimulationShaderRef>(null)
  const textureSize = useMemo(() => Math.sqrt(particlesCount), [particlesCount])

  // Animation values
  const scatteredAmount = useRef({ value: 1 })

  useGSAP(() => {
    // Transition points in on mount
    gsap.to(scatteredAmount.current, {
      value: 0,
      duration: 1,
      delay: 1,
      ease: 'power2.inOut',
    })
  }, [])

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
  const fboScene = useMemo(() => new Scene(), [])
  const fboCamera = useMemo(() => new OrthographicCamera(-1, 1, 1, -1, 0.1, 1), [])
  const renderTarget = useFBO({
    stencilBuffer: false,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    format: RGBAFormat,
    type: FloatType,
  })

  useFrame(({ gl, clock }) => {
    if (!pointsShaderMaterial.current || !simulationShaderMaterial.current) return

    const time = clock.elapsedTime

    // Set simulation uniforms BEFORE rendering to FBO
    simulationShaderMaterial.current.uTime = time
    simulationShaderMaterial.current.uScatteredAmount = scatteredAmount.current.value

    // Render simulation to FBO
    gl.setRenderTarget(renderTarget)
    gl.clear()
    gl.render(fboScene, fboCamera)
    gl.setRenderTarget(null)

    // Set points uniforms AFTER FBO rendering
    pointsShaderMaterial.current.uTime = time
    pointsShaderMaterial.current.uPositions = renderTarget.texture
    pointsShaderMaterial.current.uScatteredAmount = scatteredAmount.current.value
  })

  return (
    <>
      {/* Loop mesh used for sampling */}
      {/* <mesh ref={mesh} geometry={nodes.INFINITY_ThickMesh.geometry} scale={1.6}>
        <meshBasicMaterial transparent={true} opacity={0} depthTest={false} />
      </mesh> */}

      {/* Simulation */}
      {/* Responsible for calculating positions */}
      <FBOPointsSimulation
        ref={simulationShaderMaterial}
        particlesCount={particlesCount}
        textureSize={textureSize}
        fboScene={fboScene}
        seeds={seeds}
      />

      {/* Points */}
      {/* Renders the particle points */}
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
    </>
  )
}

export default FBOPoints

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
