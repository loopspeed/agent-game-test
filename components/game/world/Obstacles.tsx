'use client'
import { useFrame } from '@react-three/fiber'
import { InstancedRigidBodies, type InstancedRigidBodyProps, type RapierRigidBody } from '@react-three/rapier'
import { type FC, useLayoutEffect, useRef, useState } from 'react'

import { useObstaclesSpawning } from '@/hooks/useObstaclesToSpawn'
import { type ObstacleUserData } from '@/model/game'
import { GameStage, KILL_OBSTACLE_Z, LANES_X, LANES_Y, SPAWN_OBSTACLE_Z, useGameStore } from '@/stores/GameProvider'
import { type ObstacleSpawnData, Phase, useWorldStore } from '@/stores/WorldProvider'

type ObstacleInstance = {
  id: string
  x: number
  y: number
  z: number
  isAlive: boolean
  speed: number // Store speed from rhythm data
}

const INSTANCES_COUNT = 50 // Increased to handle cluster spawning (8 obstacles at once)

const Obstacles: FC = () => {
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const isObstaclesPhase = useWorldStore((s) => s.phase === Phase.OBSTACLES)

  const obstaclesData = useRef<ObstacleInstance[]>([])
  const [obstacleInstances, setObstacleInstances] = useState<InstancedRigidBodyProps[]>([])
  const rigidBodies = useRef<RapierRigidBody[]>(null)
  const isSetup = useRef(false)

  const { gameTime, obstaclesToSpawn } = useObstaclesSpawning()
  const spawnedIds = useRef<string[]>([])

  // Clear spawned IDs when entering obstacles phase to reset for new obstacle sequence
  useLayoutEffect(() => {
    if (isObstaclesPhase) {
      spawnedIds.current = []
      console.warn('🧹 CLEARED SPAWNED IDS FOR NEW OBSTACLES PHASE')
    }
  }, [isObstaclesPhase])

  useLayoutEffect(() => {
    const setupInstances = () => {
      if (isSetup.current) return // Prevent double setup

      console.warn('🏗️ Setting up rhythm-based obstacle instances:')

      const instances: InstancedRigidBodyProps[] = []
      const data: ObstacleInstance[] = []
      const initialData: ObstacleInstance = {
        id: '',
        x: 0,
        y: 0,
        z: -40, // Start far behind spawn
        isAlive: false,
        speed: 0, // Will be set when spawned
      }

      for (let i = 0; i < INSTANCES_COUNT; i++) {
        data.push({ ...initialData, id: `obstacle-${i}` })
        const userData: ObstacleUserData = {
          type: 'obstacle',
        }
        instances.push({
          key: `obstacle-${i}`,
          position: [initialData.x, initialData.y, initialData.z],
          userData,
        })
      }

      obstaclesData.current = data
      setObstacleInstances(instances)
      isSetup.current = true
      console.warn('Rhythm obstacle instances set up:', { count: instances.length })
    }

    if (isPlaying && !isSetup.current) {
      setupInstances()
    }

    // Reset setup flag when game stops
    if (!isPlaying) {
      isSetup.current = false
    }
  }, [isPlaying])

  function spawnObstacles() {
    if (!isObstaclesPhase) return // Only spawn during obstacles phase

    // Spawn new obstacles
    obstaclesToSpawn.current.forEach((spawnData: ObstacleSpawnData) => {
      if (spawnedIds.current.includes(spawnData.id)) return // Already spawned this one
      // Check if it's time to spawn this obstacle
      if (gameTime.current < spawnData.spawnTime) return // Not yet time to spawn

      console.warn(
        `⏰ SPAWNING OBSTACLE AT TIME: ${gameTime.current.toFixed(2)} >= ${spawnData.spawnTime.toFixed(2)}`,
        {
          obstacleId: spawnData.id,
          lanesCount: spawnData.lanes.length,
          safeLanes: spawnData.safeLanes,
        },
      )

      // Mark this obstacle as spawned first to prevent duplicate spawning
      spawnedIds.current.push(spawnData.id)

      // Determine spawn positions based on rhythm data
      const spawnPositions = getObstacleSpawnPositions(spawnData)

      // For cluster actions, spawn obstacles at all specified positions
      spawnPositions.forEach((spawnPos, index) => {
        const deadObstacleIndex = obstaclesData.current.findIndex((o) => !o.isAlive)
        if (deadObstacleIndex !== -1) {
          const body = rigidBodies.current![deadObstacleIndex]
          if (!!body) {
            const newData: ObstacleInstance = {
              id: `${spawnData.id}_lane_${spawnPos.laneIndex}`,
              x: spawnPos.x,
              y: spawnPos.y,
              z: SPAWN_OBSTACLE_Z,
              isAlive: true,
              speed: spawnData.speed,
            }

            console.warn(`🎵 SPAWNING OBSTACLE ${index + 1}/${spawnPositions.length}:`, {
              id: newData.id,
              lane: spawnPos.laneIndex,
              position: { x: spawnPos.x, y: spawnPos.y },
              speed: newData.speed,
            })

            // Position and start moving the obstacle
            body.setTranslation({ x: newData.x, y: newData.y, z: newData.z }, true)
            body.setLinvel({ x: 0, y: 0, z: newData.speed }, true)
            obstaclesData.current[deadObstacleIndex] = newData
          }
        } else {
          console.error(`⚠️ NO AVAILABLE OBSTACLE INSTANCES TO SPAWN! Increase INSTANCES_COUNT.`)
        }
      })
    })
  }

  function cleanUpObstacles() {
    // Clean up obstacles that are out of bounds
    obstaclesData.current.forEach((obstacle, i) => {
      if (!obstacle.isAlive) return

      const body = rigidBodies.current![i]
      if (!body) return

      const currentPos = body.translation()
      if (currentPos.z > KILL_OBSTACLE_Z) {
        // Reset obstacle
        obstacle.isAlive = false
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setTranslation({ x: 0, y: 0, z: -40 }, true)
        console.warn(`♻️ RECYCLED RHYTHM OBSTACLE: ${obstacle.id}`)
      }
    })
  }

  useFrame(() => {
    if (!obstacleInstances.length || !rigidBodies.current || !isPlaying) return
    spawnObstacles()
    cleanUpObstacles()
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
        <meshBasicMaterial color="#ff6b6b" />
      </instancedMesh>
    </InstancedRigidBodies>
  )
}

/**
 * Converts rhythm obstacle lane indices to world positions
 */
function getObstacleSpawnPositions(data: ObstacleSpawnData): Array<{ x: number; y: number; laneIndex: number }> {
  return data.lanes.map((laneIndex) => {
    // Convert lane index to grid coordinates
    const gridY = Math.floor(laneIndex / LANES_X.length)
    const gridX = laneIndex % LANES_X.length
    // Convert to world positions
    const x = LANES_X[gridX] || 0
    const y = LANES_Y[gridY] || 0
    return { x, y, laneIndex }
  })
}

export default Obstacles
