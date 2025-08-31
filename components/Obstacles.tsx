'use client'
import { useFrame } from '@react-three/fiber'
import { InstancedRigidBodies, type InstancedRigidBodyProps, type RapierRigidBody } from '@react-three/rapier'
import { type FC, useLayoutEffect, useRef, useState } from 'react'

import { Answer } from '@/data/questions'
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

const BASE_SPEED = 10.0

const getNewObstacleData = ({
  isAlive,
  answerMapping,
}: {
  isAlive: boolean
  answerMapping: (Answer | null)[]
}): ObstacleData => {
  let ix: number, iy: number, gridIndex: number
  let attempts = 0
  const maxAttempts = 12 // Prevent infinite loop
  // Prevent the obstacle spawning in a lane with an existing answer
  do {
    // Random lane
    ix = Math.floor(Math.random() * LANES_X.length)
    iy = Math.floor(Math.random() * LANES_Y.length)
    // Calculate grid index: y * width + x (3x3 grid)
    gridIndex = iy * LANES_X.length + ix
    attempts++
  } while (
    answerMapping &&
    answerMapping[gridIndex] !== null && // Lane has an answer
    attempts < maxAttempts
  )

  const offCenterAmount = Math.random() * 0.2 - 0.1 // Random offset between -0.1 and 0.1
  return {
    x: LANES_X[ix] + offCenterAmount,
    y: LANES_Y[iy] + offCenterAmount,
    z: SPAWN_OBSTACLE_Z,
    isAlive,
    speedAdjustment: Math.random() * 2.0 - 1.0, // -1.0 to +1.0
  }
}

const getObstacleSpeed = (data: ObstacleData, timeMultiplier: number): number => {
  return timeMultiplier * BASE_SPEED + data.speedAdjustment
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

  useLayoutEffect(() => {
    const setupInstances = () => {
      console.warn('🏗️ Generating obstacle instances:', { maxObstacles })
      const instances: InstancedRigidBodyProps[] = []
      // Setup data for each one
      const data: ObstacleData[] = []

      for (let i = 0; i < maxObstacles; i++) {
        // All start inactive
        const obstacleData = getNewObstacleData({ isAlive: false, answerMapping })
        data.push(obstacleData)

        const userData: ObstacleUserData = {
          type: 'obstacle',
        }

        instances.push({
          key: `obstacle_${i}`,
          position: [obstacleData.x, obstacleData.y, -1000], // Start hidden far away behind spawn
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Controlled spawning: find first dead obstacle and spawn it based on spawnInterval)
    const deadObstacleIndex = obstacles.findIndex((o) => !o.isAlive)
    const timeSinceLastSpawn = gameTime.current - lastSpawnTime.current

    if (deadObstacleIndex !== -1 && timeSinceLastSpawn >= spawnInterval) {
      const body = rigidBodies.current[deadObstacleIndex]
      if (!!body) {
        lastSpawnTime.current = gameTime.current // Update last spawn time
        console.warn(`SPAWNING OBSTACLE ${deadObstacleIndex}`)

        const newData = getNewObstacleData({ isAlive: true, answerMapping })
        const newSpeed = getObstacleSpeed(newData, timeMultiplier.current)
        // Position the body at spawn location (this should make it visible)
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
        obstacle.isAlive = false
        // Move body out of view and stop it moving
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setTranslation({ x: 0, y: 0, z: SPAWN_OBSTACLE_Z - 1000 }, true)
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
