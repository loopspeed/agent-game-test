/**
 * RhythmObstacles Component
 *
 * Example implementation showing how to replace the old random obstacle spawning
 * with the new rhythm-based system. This component demonstrates the integration
 * pattern that should be applied to the existing Obstacles.tsx component.
 */

'use client'
import { useFrame } from '@react-three/fiber'
import { InstancedRigidBodies, type InstancedRigidBodyProps, type RapierRigidBody } from '@react-three/rapier'
import { type FC, useLayoutEffect, useRef, useState } from 'react'

import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { useRhythmSystem, type RhythmObstacleData } from '@/hooks/useRhythmSystem'
import { type ObstacleUserData } from '@/model/game'
import { GameStage, KILL_OBSTACLE_Z, LANES_X, LANES_Y, SPAWN_OBSTACLE_Z, useGameStore } from '@/stores/GameProvider'

type ObstacleInstance = {
  id: string
  x: number
  y: number
  z: number
  isAlive: boolean
  rhythmData?: RhythmObstacleData
}

const OBSTACLE_SPEED = 12.0

const RhythmSphereObstacles: FC = () => {
  const maxObstacles = useGameStore((s) => s.maxObstacles)
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const questions = useGameStore((s) => s.questions)

  // Initialize rhythm system
  const { updateRhythmSystem, getObstaclesToSpawn, isRhythmActive } = useRhythmSystem({
    questions,
    enabled: true,
  })

  // Store obstacle instances
  const obstaclesData = useRef<ObstacleInstance[]>([])
  const [obstacleInstances, setObstacleInstances] = useState<InstancedRigidBodyProps[]>([])
  const rigidBodies = useRef<RapierRigidBody[]>(null)
  const gameTime = useRef(0)

  useLayoutEffect(() => {
    const setupInstances = () => {
      console.warn('🏗️ Setting up rhythm-based obstacle instances:', { maxObstacles })

      const instances: InstancedRigidBodyProps[] = []
      const data: ObstacleInstance[] = []
      const initialData: ObstacleInstance = {
        id: '',
        x: 0,
        y: 0,
        z: -1000, // Start far behind spawn
        isAlive: false,
      }

      for (let i = 0; i < maxObstacles; i++) {
        data.push({ ...initialData, id: `obstacle_${i}` })

        const userData: ObstacleUserData = {
          type: 'obstacle',
        }

        instances.push({
          key: `rhythm_obstacle_${i}`,
          position: [initialData.x, initialData.y, initialData.z],
          userData,
        })
      }

      obstaclesData.current = data
      gameTime.current = 0
      setObstacleInstances(instances)
      console.warn('Rhythm obstacle instances set up:', { count: instances.length })
    }

    if (isPlaying) {
      setupInstances()
    }
  }, [isPlaying, maxObstacles])

  const { timeMultiplier } = useTimeSubscription((timeMultiplier) => {
    if (!rigidBodies.current) return

    // Update speed of active obstacles
    rigidBodies.current.forEach((body, i) => {
      if (!body) return
      const obstacleData = obstaclesData.current[i]
      if (!obstacleData.isAlive) return

      const newSpeed = OBSTACLE_SPEED * timeMultiplier
      body.setLinvel({ x: 0, y: 0, z: newSpeed }, true)
    })
  })

  useFrame(({}, delta) => {
    if (!obstacleInstances.length || !rigidBodies.current || !isPlaying) return

    // Update game time and rhythm system
    gameTime.current += delta * timeMultiplier.current
    updateRhythmSystem(gameTime.current)

    // Get obstacles that should spawn this frame
    const obstaclesToSpawn = getObstaclesToSpawn()

    // Spawn new obstacles based on rhythm system
    obstaclesToSpawn.forEach((rhythmObstacle) => {
      const deadObstacleIndex = obstaclesData.current.findIndex((o) => !o.isAlive)

      if (deadObstacleIndex !== -1) {
        const body = rigidBodies.current![deadObstacleIndex]
        if (body) {
          // Determine spawn position based on rhythm data
          const spawnPositions = getObstacleSpawnPositions(rhythmObstacle)

          // For now, spawn at the first specified lane
          const spawnPos = spawnPositions[0] || { x: 0, y: 0 }

          const newData: ObstacleInstance = {
            id: rhythmObstacle.id,
            x: spawnPos.x,
            y: spawnPos.y,
            z: SPAWN_OBSTACLE_Z,
            isAlive: true,
            rhythmData: rhythmObstacle,
          }

          console.warn(`🎵 SPAWNING RHYTHM OBSTACLE: ${rhythmObstacle.actionType}`, {
            id: rhythmObstacle.id,
            lanes: rhythmObstacle.lanes,
            position: spawnPos,
          })

          // Position and start moving the obstacle
          body.setTranslation({ x: newData.x, y: newData.y, z: newData.z }, true)
          body.setLinvel({ x: 0, y: 0, z: OBSTACLE_SPEED * timeMultiplier.current }, true)

          obstaclesData.current[deadObstacleIndex] = newData
        }
      }
    })

    // Clean up obstacles that are out of bounds
    obstaclesData.current.forEach((obstacle, i) => {
      if (!obstacle.isAlive) return

      const body = rigidBodies.current![i]
      if (!body) return

      const currentPos = body.translation()
      if (currentPos.z > KILL_OBSTACLE_Z) {
        // Reset obstacle
        obstacle.isAlive = false
        obstacle.rhythmData = undefined
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setTranslation({ x: 0, y: 0, z: -1000 }, true)

        console.warn(`♻️ RECYCLED RHYTHM OBSTACLE: ${obstacle.id}`)
      }
    })
  })

  if (!obstacleInstances.length || !isRhythmActive()) return null

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
function getObstacleSpawnPositions(rhythmObstacle: RhythmObstacleData): Array<{ x: number; y: number }> {
  return rhythmObstacle.lanes.map((laneIndex) => {
    // Convert lane index to grid coordinates
    const gridY = Math.floor(laneIndex / LANES_X.length)
    const gridX = laneIndex % LANES_X.length

    // Convert to world positions
    const x = LANES_X[gridX] || 0
    const y = LANES_Y[gridY] || 0

    return { x, y }
  })
}

export default RhythmSphereObstacles
