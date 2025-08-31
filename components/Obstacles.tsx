'use client'
import { useFrame } from '@react-three/fiber'
import { InstancedRigidBodies, type InstancedRigidBodyProps, type RapierRigidBody } from '@react-three/rapier'
import { type FC, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { ObstacleUserData } from '@/model/game'
import { GameStage, KILL_OBSTACLE_Z, LANES_X, LANES_Y, SPAWN_OBSTACLE_Z, useGameStore } from '@/stores/GameProvider'

type ObstacleData = {
  x: number
  y: number
  z: number
  isAlive: boolean
  speedAdjustment: number // Random speed adjustment so they don't all move at the same speed
}

const OBSTACLE_SPEED = 12.0
const totalLanes = LANES_X.length * LANES_Y.length

const getNewObstacleData = ({ isAlive, lanesToAvoid }: { isAlive: boolean; lanesToAvoid: number[] }): ObstacleData => {
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

const getObstacleSpeed = (data: ObstacleData, timeMultiplier: number): number => {
  return OBSTACLE_SPEED * timeMultiplier + data.speedAdjustment
}

const Obstacles: FC = () => {
  const maxObstacles = useGameStore((s) => s.maxObstacles)
  const spawnInterval = useGameStore((s) => s.spawnInterval)
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const answerMapping = useGameStore((s) => s.answerGatesMapping[s.currentQuestionIndex])

  // Store mutable obstacle data in ref (separate from React's memo system)
  const obstaclesData = useRef<ObstacleData[]>([])
  const [obstacleInstances, setObstacleInstances] = useState<InstancedRigidBodyProps[]>([])
  // Ref for the instanced rigid bodies
  const rigidBodies = useRef<RapierRigidBody[]>(null)
  const gameTime = useRef(0) // Track total game time for staggered spawning
  const lastSpawnTime = useRef(0) // Track when we last spawned an obstacle

  const lanesToAvoid = useMemo(() => {
    if (!answerMapping) return []
    const occupiedLanes: number[] = []
    answerMapping.forEach((answer, gridIndex) => {
      if (!!answer) occupiedLanes.push(gridIndex)
    })
    return occupiedLanes
  }, [answerMapping])

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
      const newSpeed = getObstacleSpeed(obstacleData, timeMultiplier)
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

        const newData = getNewObstacleData({ isAlive: true, lanesToAvoid })
        const newSpeed = getObstacleSpeed(newData, timeMultiplier.current)

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

export default Obstacles
