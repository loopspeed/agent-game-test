'use client'
import { useFrame } from '@react-three/fiber'
import { InstancedRigidBodies, type InstancedRigidBodyProps, type RapierRigidBody } from '@react-three/rapier'
import { type FC, useLayoutEffect, useRef, useState } from 'react'

import { useObstaclesSpawning } from '@/hooks/useObstaclesToSpawn'
import { type ObstacleUserData, type ObstacleZoneUserData } from '@/model/game'
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

type ObstacleZoneInstance = {
  id: string
  x: number
  y: number
  z: number
  isAlive: boolean
  speed: number
  obstacleId: string // Reference to the obstacle group this zone belongs to
  hasBeenTriggered: boolean // Track if player has passed through this zone
}

const INSTANCES_COUNT = 64 // Increased to handle cluster spawning (8 obstacles at once)
const ZONE_INSTANCES_COUNT = 16 // Detection zones for obstacle avoidance

const Obstacles: FC = () => {
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const isObstaclesPhase = useWorldStore((s) => s.phase === Phase.OBSTACLES)

  const obstaclesData = useRef<ObstacleInstance[]>([])
  const obstacleZonesData = useRef<ObstacleZoneInstance[]>([])
  const [obstacleInstances, setObstacleInstances] = useState<InstancedRigidBodyProps[]>([])
  const [zoneInstances, setZoneInstances] = useState<InstancedRigidBodyProps[]>([])
  const rigidBodies = useRef<RapierRigidBody[]>(null)
  const zoneRigidBodies = useRef<RapierRigidBody[]>(null)
  const isSetup = useRef(false)

  const { gameTime, obstaclesToSpawn } = useObstaclesSpawning()
  const spawnedIds = useRef<string[]>([])

  useLayoutEffect(() => {
    const setupInstances = () => {
      if (isSetup.current) return // Prevent double setup

      console.warn('🏗️ Setting up obstacle instances:')

      // Setup obstacle instances
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

      // Setup detection zone instances
      const zoneInstancesArray: InstancedRigidBodyProps[] = []
      const zoneDataArray: ObstacleZoneInstance[] = []
      const initialZoneData: ObstacleZoneInstance = {
        id: '',
        x: 0,
        y: 0,
        z: -40,
        isAlive: false,
        speed: 0,
        obstacleId: '',
        hasBeenTriggered: false,
      }

      for (let i = 0; i < ZONE_INSTANCES_COUNT; i++) {
        zoneDataArray.push({ ...initialZoneData, id: `zone-${i}` })
        const userData: ObstacleZoneUserData = {
          type: 'obstacle_zone',
          obstacleId: '',
        }
        zoneInstancesArray.push({
          key: `zone-${i}`,
          position: [initialZoneData.x, initialZoneData.y, initialZoneData.z],
          userData,
        })
      }

      obstaclesData.current = data
      obstacleZonesData.current = zoneDataArray
      setObstacleInstances(instances)
      setZoneInstances(zoneInstancesArray)
      isSetup.current = true
      console.warn('Rhythm obstacle instances set up:', {
        obstacles: instances.length,
        zones: zoneInstancesArray.length,
      })
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
        `⏰ SPAWNING OBSTACLE AT TIME: ${gameTime.current.toFixed(2)} >= SPAWN TIME: ${spawnData.spawnTime.toFixed(2)}`,
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
            // Position and start moving the obstacle
            body.setTranslation({ x: newData.x, y: newData.y, z: newData.z }, true)
            body.setLinvel({ x: 0, y: 0, z: newData.speed }, true)
            obstaclesData.current[deadObstacleIndex] = newData
          }
        } else {
          console.error(`⚠️ NO AVAILABLE OBSTACLE INSTANCES TO SPAWN! Increase INSTANCES_COUNT.`)
        }
      })

      // Spawn a detection zone for this obstacle group (covers the entire grid)
      const deadZoneIndex = obstacleZonesData.current.findIndex((z) => !z.isAlive)
      if (deadZoneIndex !== -1 && zoneRigidBodies.current) {
        const zoneBody = zoneRigidBodies.current[deadZoneIndex]
        if (!!zoneBody) {
          const newZoneData: ObstacleZoneInstance = {
            id: `${spawnData.id}_zone`,
            x: 0, // Center of the grid
            y: LANES_Y[1], // Center Y position
            z: SPAWN_OBSTACLE_Z - 2, // Slightly ahead of obstacles to detect approach
            isAlive: true,
            speed: spawnData.speed,
            obstacleId: spawnData.id,
            hasBeenTriggered: false,
          }

          console.warn(`🎯 SPAWNING DETECTION ZONE:`, {
            id: newZoneData.id,
            obstacleId: newZoneData.obstacleId,
          })

          // Position and start moving the detection zone
          zoneBody.setTranslation({ x: newZoneData.x, y: newZoneData.y, z: newZoneData.z }, true)
          zoneBody.setLinvel({ x: 0, y: 0, z: newZoneData.speed }, true)
          obstacleZonesData.current[deadZoneIndex] = newZoneData
        }
      } else {
        console.error(`⚠️ NO AVAILABLE ZONE INSTANCES TO SPAWN! Increase ZONE_INSTANCES_COUNT.`)
      }
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
        obstacle.isAlive = false
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setTranslation({ x: 0, y: 0, z: -40 }, true)
      }
    })

    // Clean up detection zones that are out of bounds
    obstacleZonesData.current.forEach((zone, i) => {
      if (!zone.isAlive) return

      const body = zoneRigidBodies.current![i]
      if (!body) return

      const currentPos = body.translation()
      if (currentPos.z > KILL_OBSTACLE_Z) {
        zone.isAlive = false
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setTranslation({ x: 0, y: 0, z: -40 }, true)
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
    <>
      {/* Visible obstacles */}
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

      {/* Invisible detection zones for obstacle avoidance */}
      {zoneInstances.length > 0 && (
        <InstancedRigidBodies
          ref={zoneRigidBodies}
          instances={zoneInstances}
          gravityScale={0}
          canSleep={false}
          sensor={true}
          colliders="cuboid">
          <instancedMesh args={[undefined, undefined, zoneInstances.length]} count={zoneInstances.length}>
            {/* Large invisible box covering the entire grid area */}
            <boxGeometry args={[6, 6, 2]} />
            <meshBasicMaterial color="#00ff00" transparent opacity={0} />
          </instancedMesh>
        </InstancedRigidBodies>
      )}
    </>
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
