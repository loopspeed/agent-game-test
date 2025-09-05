'use client'
import { useFrame } from '@react-three/fiber'
import { InstancedRigidBodies, type InstancedRigidBodyProps, type RapierRigidBody } from '@react-three/rapier'
import { type FC, useLayoutEffect, useRef, useState } from 'react'

import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { type ObstacleUserData } from '@/model/game'
import { GameStage, KILL_OBSTACLE_Z, LANES_X, LANES_Y, SPAWN_OBSTACLE_Z, useGameStore } from '@/stores/GameProvider'

type ObstacleData = {
  x: number
  y: number
  z: number
  isAlive: boolean
  speedAdjustment: number // Random speed adjustment so they don't all move at the same speed
}

type BeamObstacleData = ObstacleData & {
  rotation: number // Rotation for beam orientation (0 for horizontal, Math.PI/2 for vertical)
}

const SPHERE_OBSTACLE_SPEED = 12.0 // Base speed for sphere obstacles
const BEAM_OBSTACLE_SPEED = 18.0 // Faster speed for beam obstacles (laser beams should be quick!)
const totalLanes = LANES_X.length * LANES_Y.length

const getNewSphereObstacleData = ({
  isAlive,
  lanesToAvoid,
}: {
  isAlive: boolean
  lanesToAvoid: number[]
}): ObstacleData => {
  let gridIndex: number
  const availableLanes: number[] = []

  for (let i = 0; i < totalLanes; i++) {
    if (!lanesToAvoid.includes(i)) {
      availableLanes.push(i)
    }
  }

  if (availableLanes.length === 0) {
    throw new Error('No available lanes to spawn obstacle')
  } else {
    // Pick a random available lane
    const randomAvailableIndex = Math.floor(Math.random() * availableLanes.length)
    gridIndex = availableLanes[randomAvailableIndex]
  }

  // Convert grid index back to x,y coordinates
  const iy = Math.floor(gridIndex / LANES_X.length)
  const ix = gridIndex % LANES_X.length

  const offCenterAmount = Math.random() * 0.2 - 0.1 // Random offset between -0.1 and 0.1 to add variation
  return {
    x: LANES_X[ix] + offCenterAmount,
    y: LANES_Y[iy] + offCenterAmount,
    z: SPAWN_OBSTACLE_Z,
    isAlive,
    speedAdjustment: Math.random() * 4.0 - 2.0, // -2.0 to +2.0
  }
}

const getSphereObstacleSpeed = (data: ObstacleData, timeMultiplier: number): number => {
  return SPHERE_OBSTACLE_SPEED * timeMultiplier + data.speedAdjustment
}

const getBeamObstacleSpeed = (data: BeamObstacleData, timeMultiplier: number): number => {
  return BEAM_OBSTACLE_SPEED * timeMultiplier + data.speedAdjustment
}

const getNewBeamObstacleData = ({
  isAlive,
  lanesToAvoid,
}: {
  isAlive: boolean
  lanesToAvoid: number[]
}): BeamObstacleData => {
  // Get pairs of adjacent lanes for beam placement
  const adjacentPairs: Array<{
    lanes: number[]
    position: { x: number; y: number }
    rotation: number
  }> = []

  // Horizontal pairs (spans 2 columns in same row)
  for (let row = 0; row < LANES_Y.length; row++) {
    for (let col = 0; col < LANES_X.length - 1; col++) {
      const lane1 = row * LANES_X.length + col
      const lane2 = row * LANES_X.length + (col + 1)
      const centerX = (LANES_X[col] + LANES_X[col + 1]) / 2
      const centerY = LANES_Y[row]

      adjacentPairs.push({
        lanes: [lane1, lane2],
        position: { x: centerX, y: centerY },
        rotation: 0, // Horizontal
      })
    }
  }

  // Vertical pairs (spans 2 rows in same column)
  for (let row = 0; row < LANES_Y.length - 1; row++) {
    for (let col = 0; col < LANES_X.length; col++) {
      const lane1 = row * LANES_X.length + col
      const lane2 = (row + 1) * LANES_X.length + col
      const centerX = LANES_X[col]
      const centerY = (LANES_Y[row] + LANES_Y[row + 1]) / 2

      adjacentPairs.push({
        lanes: [lane1, lane2],
        position: { x: centerX, y: centerY },
        rotation: Math.PI / 2, // Vertical
      })
    }
  }

  // Filter pairs where BOTH lanes are available (beam spans exactly these 2 lanes)
  const availablePairs = adjacentPairs.filter((pair) => !pair.lanes.some((lane) => lanesToAvoid.includes(lane)))

  if (availablePairs.length === 0) {
    throw new Error('No available adjacent lanes to spawn beam obstacle')
  }

  // Pick a random available pair
  const randomPair = availablePairs[Math.floor(Math.random() * availablePairs.length)]

  const offCenterAmount = Math.random() * 0.1 - 0.05 // Smaller offset for beams
  return {
    x: randomPair.position.x + offCenterAmount,
    y: randomPair.position.y + offCenterAmount,
    z: SPAWN_OBSTACLE_Z,
    isAlive,
    speedAdjustment: Math.random() * 4.0 - 2.0, // -2.0 to +2.0
    rotation: randomPair.rotation,
  }
}

// These could be like rocks or debris to avoid
const SphereObstacles: FC = () => {
  const maxObstacles = useGameStore((s) => s.maxObstacles)
  const spawnInterval = useGameStore((s) => s.spawnInterval)
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const answerOccupiedLanes = useGameStore((s) => s.answerOccupiedLanes)

  // Store mutable obstacle data in ref (separate from React's memo system)
  const obstaclesData = useRef<ObstacleData[]>([])
  const [obstacleInstances, setObstacleInstances] = useState<InstancedRigidBodyProps[]>([])
  // Ref for the instanced rigid bodies
  const rigidBodies = useRef<RapierRigidBody[]>(null)
  const gameTime = useRef(0) // Track total game time for staggered spawning
  const lastSpawnTime = useRef(0) // Track when we last spawned an obstacle

  useLayoutEffect(() => {
    const setupInstances = () => {
      console.warn('🏗️ Generating obstacle instances:', { maxObstacles })

      const instances: InstancedRigidBodyProps[] = []
      const data: ObstacleData[] = []
      const initialData: ObstacleData = {
        x: 0,
        y: 0,
        z: -40,
        isAlive: false,
        speedAdjustment: 0,
      }
      // Start hidden far away behind spawn

      for (let i = 0; i < maxObstacles; i++) {
        data.push(initialData)

        const userData: ObstacleUserData = {
          type: 'obstacle',
        }

        instances.push({
          key: `obstacle_${i}`,
          position: [initialData.x, initialData.y, initialData.z],
          userData,
        })
      }

      obstaclesData.current = data
      gameTime.current = 0
      lastSpawnTime.current = 0
      setObstacleInstances(instances)
      console.warn('Obstacle instances set up:', { instances, data })
    }

    if (isPlaying) {
      setupInstances()
    }
  }, [isPlaying, maxObstacles])

  const { timeMultiplier } = useTimeSubscription((timeMultiplier) => {
    if (!rigidBodies.current) return
    // Update the speed of any active obstacles when the time changes
    rigidBodies.current.forEach((body, i) => {
      if (!body) return
      const obstacleData = obstaclesData.current[i]
      if (!obstacleData.isAlive) return
      const newSpeed = getSphereObstacleSpeed(obstacleData, timeMultiplier)
      body.setLinvel({ x: 0, y: 0, z: newSpeed }, true)
    })
  })

  useFrame(({}, delta) => {
    if (!obstacleInstances.length || !rigidBodies.current || !isPlaying) return

    // Update game time for staggered spawning
    gameTime.current += delta * timeMultiplier.current
    const obstacles = obstaclesData.current

    // Controlled spawning: find first dead obstacle and spawn it based on spawnInterval
    const deadObstacleIndex = obstacles.findIndex((o) => !o.isAlive)
    const timeSinceLastSpawn = gameTime.current - lastSpawnTime.current

    if (deadObstacleIndex !== -1 && timeSinceLastSpawn >= spawnInterval) {
      const body = rigidBodies.current[deadObstacleIndex]
      if (!!body) {
        lastSpawnTime.current = gameTime.current // Update last spawn time

        const newData = getNewSphereObstacleData({ isAlive: true, lanesToAvoid: answerOccupiedLanes })
        const newSpeed = getSphereObstacleSpeed(newData, timeMultiplier.current)

        console.warn(`SPAWNING OBSTACLE ${deadObstacleIndex}`, { newData, newSpeed })
        // Position the body at spawn location
        body.setTranslation({ x: newData.x, y: newData.y, z: newData.z }, true)
        // Using setLinvel for consistent, even-paced movement
        body.setLinvel({ x: 0, y: 0, z: newSpeed }, true)

        obstacles[deadObstacleIndex] = newData
      }
    }

    // Check if any alive obstacles are out of bounds for recycling
    obstacles.forEach((obstacle, i) => {
      if (!obstacle.isAlive) return // Skip dead ones
      const body = rigidBodies.current![i]
      if (!body) return
      const currentPos = body.translation()
      if (currentPos.z > KILL_OBSTACLE_Z) {
        // Reset obstacle state
        obstacle.x = 0
        obstacle.y = 0
        obstacle.z = -1000
        obstacle.isAlive = false
        // Move body out of view and stop it moving
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setTranslation({ x: 0, y: 0, z: -1000 }, true)
        console.warn(`♻️ KILLED OBSTACLE ${i}`)
      }
    })
  })

  if (!obstacleInstances.length) return null

  return (
    <InstancedRigidBodies
      ref={rigidBodies}
      instances={obstacleInstances}
      gravityScale={0}
      canSleep={false}
      sensor={true}
      colliders="ball">
      <instancedMesh args={[undefined, undefined, obstacleInstances.length]} count={obstacleInstances.length}>
        <sphereGeometry args={[0.25, 24, 24]} />
        <meshBasicMaterial color="#fff" />
      </instancedMesh>
    </InstancedRigidBodies>
  )
}

// These could be lazer beams or beam obstacles

const BeamObstacles: FC = () => {
  const maxObstacles = useGameStore((s) => s.maxObstacles)
  const spawnInterval = useGameStore((s) => s.spawnInterval)
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const answerOccupiedLanes = useGameStore((s) => s.answerOccupiedLanes)

  // Store mutable obstacle data in ref (separate from React's memo system)
  const obstaclesData = useRef<BeamObstacleData[]>([])
  const [obstacleInstances, setObstacleInstances] = useState<InstancedRigidBodyProps[]>([])
  // Ref for the instanced rigid bodies
  const rigidBodies = useRef<RapierRigidBody[]>(null)
  const gameTime = useRef(0) // Track total game time for staggered spawning
  const lastSpawnTime = useRef(0) // Track when we last spawned an obstacle

  useLayoutEffect(() => {
    const setupInstances = () => {
      console.warn('🏗️ Generating beam obstacle instances:', { maxObstacles })

      const instances: InstancedRigidBodyProps[] = []
      const data: BeamObstacleData[] = []
      const initialData: BeamObstacleData = {
        x: 0,
        y: 0,
        z: -40,
        isAlive: false,
        speedAdjustment: 0,
        rotation: 0,
      }
      // Start hidden far away behind spawn

      for (let i = 0; i < maxObstacles; i++) {
        data.push(initialData)

        const userData: ObstacleUserData = {
          type: 'obstacle',
        }

        instances.push({
          key: `beam_obstacle_${i}`,
          position: [initialData.x, initialData.y, initialData.z],
          userData,
        })
      }

      obstaclesData.current = data
      gameTime.current = 0
      lastSpawnTime.current = 0
      setObstacleInstances(instances)
      console.warn('Beam obstacle instances set up:', { instances, data })
    }

    if (isPlaying) {
      setupInstances()
    }
  }, [isPlaying, maxObstacles])

  const { timeMultiplier } = useTimeSubscription((timeMultiplier) => {
    if (!rigidBodies.current) return
    // Update the speed of any active obstacles when the time changes
    rigidBodies.current.forEach((body, i) => {
      if (!body) return
      const obstacleData = obstaclesData.current[i]
      if (!obstacleData.isAlive) return
      const newSpeed = getBeamObstacleSpeed(obstacleData, timeMultiplier)
      body.setLinvel({ x: 0, y: 0, z: newSpeed }, true)
    })
  })

  useFrame(({}, delta) => {
    if (!obstacleInstances.length || !rigidBodies.current || !isPlaying) return

    // Update game time for staggered spawning
    gameTime.current += delta * timeMultiplier.current
    const obstacles = obstaclesData.current

    // Controlled spawning: find first dead obstacle and spawn it based on spawnInterval
    const deadObstacleIndex = obstacles.findIndex((o) => !o.isAlive)
    const timeSinceLastSpawn = gameTime.current - lastSpawnTime.current

    if (deadObstacleIndex !== -1 && timeSinceLastSpawn >= spawnInterval) {
      const body = rigidBodies.current[deadObstacleIndex]
      if (!!body) {
        lastSpawnTime.current = gameTime.current // Update last spawn time

        const newData = getNewBeamObstacleData({ isAlive: true, lanesToAvoid: answerOccupiedLanes })
        const newSpeed = getBeamObstacleSpeed(newData, timeMultiplier.current)

        console.warn(`SPAWNING BEAM OBSTACLE ${deadObstacleIndex}`, { newData, newSpeed })
        // Position the body at spawn location
        body.setTranslation({ x: newData.x, y: newData.y, z: newData.z }, true)
        // Set rotation for beam orientation
        body.setRotation({ w: Math.cos(newData.rotation / 2), x: 0, y: 0, z: Math.sin(newData.rotation / 2) }, true)
        // Using setLinvel for consistent, even-paced movement
        body.setLinvel({ x: 0, y: 0, z: newSpeed }, true)

        obstacles[deadObstacleIndex] = newData
      }
    }

    // Check if any alive obstacles are out of bounds for recycling
    obstacles.forEach((obstacle, i) => {
      if (!obstacle.isAlive) return // Skip dead ones
      const body = rigidBodies.current![i]
      if (!body) return
      const currentPos = body.translation()
      if (currentPos.z > KILL_OBSTACLE_Z) {
        // Reset obstacle state
        obstacle.x = 0
        obstacle.y = 0
        obstacle.z = -1000
        obstacle.isAlive = false
        obstacle.rotation = 0
        // Move body out of view and stop it moving
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setTranslation({ x: 0, y: 0, z: -1000 }, true)
        console.warn(`♻️ KILLED BEAM OBSTACLE ${i}`)
      }
    })
  })

  if (!obstacleInstances.length) return null

  return (
    <InstancedRigidBodies
      ref={rigidBodies}
      instances={obstacleInstances}
      gravityScale={0}
      canSleep={false}
      sensor={true}
      colliders="cuboid">
      <instancedMesh args={[undefined, undefined, obstacleInstances.length]} count={obstacleInstances.length}>
        <boxGeometry args={[3.2, 0.2, 0.2]} />
        <meshBasicMaterial color="#ff4444" />
      </instancedMesh>
    </InstancedRigidBodies>
  )
}

export { BeamObstacles, SphereObstacles }
