'use client'

import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  InstancedRigidBodies,
  type InstancedRigidBodyProps,
  Physics,
  type RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import { type FC, Suspense, useEffect, useRef, useState } from 'react'
import React from 'react'
// import the noise functions you need
import { createNoise2D } from 'simplex-noise'
// import { createNoise3D } from 'simplex-noise'

function TestingPage() {
  return (
    <>
      <Canvas
        className="!fixed inset-0 !h-lvh"
        performance={{ min: 0.2, debounce: 300 }}
        gl={{
          antialias: false,
          alpha: false,
        }}
        camera={{ position: [0, 8, 4], fov: 65, far: 100 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={2} />
          <pointLight position={[5, 5, 0]} />
          <OrbitControls makeDefault={true} />

          <Physics debug={true}>
            <Terrain />
            <Ball />
          </Physics>
        </Suspense>
      </Canvas>
    </>
  )
}

export default TestingPage

const Terrain: FC = () => {
  const rigidBodies = useRef<RapierRigidBody[]>(null)
  const [terrainInstances, setTerrainInstances] = useState<InstancedRigidBodyProps[]>([])
  const isSetup = useRef(false)

  // Grid configuration
  const COLUMNS = 12
  const ROWS = 24
  const BOX_SIZE = 1
  const BOX_SPACING = 1
  const TERRAIN_SPEED = 3

  // 3D Noise configuration
  const noise3D = useRef(createNoise2D())
  const HEIGHT_MULTIPLIER = 1 // Multiply noise values to increase height variation
  const PLATFORM_THRESHOLD = 0.3 // Heights above this become solid blocks

  // Pre-generated noise data
  const NOISE_DATA_ROWS = 256
  const noiseData = useRef<number[][]>([]) // [row][col] = height
  const nextDataIndex = useRef(0) // Current row index in the noise data

  // Conveyor belt state
  const zOffset = useRef(0) // Track how far the terrain has moved

  useEffect(() => {
    if (isSetup.current) return

    // Pre-generate 256 rows of noise data
    for (let row = 0; row < NOISE_DATA_ROWS; row++) {
      const rowData: number[] = []
      for (let col = 0; col < COLUMNS; col++) {
        const x = (col - COLUMNS / 2 + 0.5) * BOX_SPACING
        const z = row * BOX_SPACING
        const noiseValue = noise3D.current(x * 0.12, z * 0.04) * 0.5 + 0.5 // Normalize to [0,1]
        const adjustedNoiseValue = noiseValue > PLATFORM_THRESHOLD ? 1.0 : -4.0
        const height = adjustedNoiseValue * HEIGHT_MULTIPLIER

        rowData.push(height)
      }
      noiseData.current.push(rowData)
    }

    console.log({ noiseData: noiseData.current })

    // Generate initial instances using the first 24 rows of noise data
    const instances: InstancedRigidBodyProps[] = []

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        const x = (col - COLUMNS / 2 + 0.5) * BOX_SPACING
        const z = (row - ROWS / 2) * BOX_SPACING
        const y = noiseData.current[row][col] // Sample from pre-generated data

        instances.push({
          key: `terrain-${row}-${col}`,
          position: [x, y, z],
          userData: { type: 'terrain', rowIndex: row, colIndex: col },
        })
      }
    }

    setTerrainInstances(instances)
    nextDataIndex.current = ROWS // Start sampling from row 24 onwards
    isSetup.current = true
  }, [])

  useFrame(() => {
    if (!rigidBodies.current) return

    zOffset.current += TERRAIN_SPEED * (1 / 60)

    // Move all terrain boxes forward and recycle when they pass behind
    rigidBodies.current.forEach((body, index) => {
      if (!body) return

      const position = body.translation()

      // If box has moved too far forward, recycle it to the back
      if (position.z > 10) {
        const col = index % COLUMNS
        const x = (col - COLUMNS / 2 + 0.5) * BOX_SPACING
        const newZ = position.z - ROWS * BOX_SPACING

        // Sample from pre-generated noise data or use flat terrain
        let y = 0
        if (nextDataIndex.current < NOISE_DATA_ROWS) {
          y = noiseData.current[nextDataIndex.current][col]
        }
        // If we've used all 256 rows, y remains 0 (flat)

        body.setTranslation({ x, y, z: newZ }, true)

        // Advance to next row when we've processed all columns of current row
        if (col === COLUMNS - 1) {
          nextDataIndex.current++
        }
      }

      // Set continuous forward velocity
      body.setLinvel({ x: 0, y: 0, z: TERRAIN_SPEED }, true)
    })
  })

  if (!terrainInstances.length) return null

  return (
    <group rotation={[0, 0, 0]}>
      <InstancedRigidBodies
        ref={rigidBodies}
        instances={terrainInstances}
        type="kinematicVelocity"
        canSleep={false}
        sensor={false}
        colliders="cuboid"
        restitution={0.3}
        friction={3}>
        <instancedMesh args={[undefined, undefined, terrainInstances.length]} count={terrainInstances.length}>
          <boxGeometry args={[BOX_SIZE, BOX_SIZE, BOX_SIZE]} />
          <meshStandardMaterial color="grey" wireframe={false} transparent={true} opacity={0.5} />
        </instancedMesh>
      </InstancedRigidBodies>
    </group>
  )
}

const Ball: FC = () => {
  const bodyRef = useRef<RapierRigidBody>(null)
  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders="ball"
      userData={{
        type: 'player',
      }}>
      <mesh castShadow={true} position={[0, 4, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </RigidBody>
  )
}
