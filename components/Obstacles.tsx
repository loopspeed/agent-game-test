'use client'
import { type FC, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { KILL_OBSTACLE_Z, SPAWN_OBSTACLE_Z, useWorldStore } from '@/stores/worldStore'
import { type RapierRigidBody, InstancedRigidBodies, type InstancedRigidBodyProps } from '@react-three/rapier'

/**
 * SIMPLIFIED PHYSICS-BASED OBSTACLES SYSTEM
 *
 * This component uses dynamic rigid bodies with applied forces instead of kinematic positioning.
 * Key features:
 * - Simple isAlive boolean state management
 * - Each obstacle gets a random velocity multiplier (0.5x to 1.5x base speed)
 * - Uses applyImpulse() once at spawn to project obstacles along Z-axis
 * - No continuous position updates in useFrame - pure physics simulation
 * - Obstacles are recycled when they go out of bounds
 * - Spawns one obstacle at a time when slots are available (after 1 second delay)
 */

type ObstacleData = {
  x: number
  y: number
  z: number
  isAlive: boolean
  velocity: number // Random velocity multiplier
}

const generateInitialObstacles = ({
  count,
  spawnZ,
  lanesX,
  lanesY,
}: {
  count: number
  lanesX: number[]
  lanesY: number[]
  spawnZ: number
}): ObstacleData[] => {
  const obstacles: ObstacleData[] = []
  for (let i = 0; i < count; i++) {
    obstacles.push({
      x: lanesX[i % lanesX.length],
      y: lanesY[Math.floor(i / lanesX.length) % lanesY.length],
      z: spawnZ,
      isAlive: false,
      velocity: 0.5 + Math.random() * 1.0, // Random velocity between 0.5x and 1.5x base speed
    })
  }
  return obstacles
}

const Obstacles: FC = () => {
  const lanesX = useWorldStore((s) => s.lanesX)
  const lanesY = useWorldStore((s) => s.lanesY)
  const maxObstacles = useWorldStore((s) => s.maxObstacles)
  const speed = useWorldStore((s) => s.speed)
  const isPlaying = useWorldStore((s) => s.isPlaying)

  // Pre-create obstacle slots. They start inactive.
  const obstaclesData = useRef<ObstacleData[]>(
    generateInitialObstacles({ count: maxObstacles, spawnZ: SPAWN_OBSTACLE_Z, lanesX, lanesY }),
  )

  useEffect(() => {
    const newObstacles = generateInitialObstacles({ count: maxObstacles, spawnZ: SPAWN_OBSTACLE_Z, lanesX, lanesY })
    obstaclesData.current = newObstacles

    // Reset game time when obstacles are regenerated
    gameTime.current = 0
    console.log('🔄 Obstacles regenerated and game time reset')
  }, [maxObstacles, lanesX, lanesY])

  // Reset all obstacles when game starts/stops
  useEffect(() => {
    if (!isPlaying) {
      gameTime.current = 0
      console.log('🛑 Game stopped - resetting obstacle system')

      // Reset all obstacle states
      obstaclesData.current.forEach((obstacle, i) => {
        obstacle.isAlive = false
        obstacle.velocity = 0.5 + Math.random() * 1.0

        // Reset physics bodies if available
        if (rigidBodies.current?.[i]) {
          const body = rigidBodies.current[i]
          body.setTranslation({ x: 0, y: 0, z: SPAWN_OBSTACLE_Z - 100 }, true)
          body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        }
      })
    } else {
      console.log('🎮 Game started - obstacle spawning enabled')
    }
  }, [isPlaying])

  // DEBUG: Add a simple state logger
  const frameCount = useRef(0)

  // Ref for the instanced rigid bodies
  const rigidBodies = useRef<RapierRigidBody[]>(null)
  const gameTime = useRef(0) // Track total game time for staggered spawning

  // Create instances array for InstancedRigidBodies
  const instances = useMemo(() => {
    const instancesArray: InstancedRigidBodyProps[] = []
    for (let i = 0; i < maxObstacles; i++) {
      instancesArray.push({
        key: `obstacle_${i}`,
        position: [0, 0, SPAWN_OBSTACLE_Z - 100], // Start all far away initially
        userData: { kind: 'obstacle' },
      })
    }
    return instancesArray
  }, [maxObstacles])

  useFrame(({ camera }, delta) => {
    frameCount.current++
    if (!rigidBodies.current || !isPlaying) {
      return
    }

    // Update game time for staggered spawning
    gameTime.current += delta

    const cameraZ = camera.position.z
    const obstacles = obstaclesData.current

    // DEBUG: Log frame summary less frequently
    if (frameCount.current % 120 === 0) {
      const aliveObstacles = obstacles.filter((o) => o.isAlive)
      const obstaclePositions = aliveObstacles.map((o) => {
        const actualIndex = obstacles.indexOf(o)
        const body = rigidBodies.current?.[actualIndex]
        const pos = body ? body.translation() : { x: 0, y: 0, z: 0 }
        const vel = body ? body.linvel() : { x: 0, y: 0, z: 0 }
        return {
          index: actualIndex,
          pos: { x: pos.x.toFixed(2), y: pos.y.toFixed(2), z: pos.z.toFixed(2) },
          vel: { x: vel.x.toFixed(2), y: vel.y.toFixed(2), z: vel.z.toFixed(2) },
        }
      })

      console.log('🔄 Physics-based obstacles frame summary', {
        frameNumber: frameCount.current,
        gameTime: gameTime.current.toFixed(2),
        aliveObstacles: aliveObstacles.length,
        cameraZ: cameraZ.toFixed(2),
        obstaclePositions: obstaclePositions.slice(0, 3), // Show first 3 for brevity
      })
    }

    // Simple spawning: find first dead obstacle and spawn it
    const deadObstacle = obstacles.find((o) => !o.isAlive)
    if (deadObstacle && gameTime.current >= 1.0) {
      // Start spawning after 1 second
      const obstacleIndex = obstacles.indexOf(deadObstacle)
      const body = rigidBodies.current[obstacleIndex]

      if (body) {
        console.log(`🚀 SPAWN ${obstacleIndex} at time ${gameTime.current.toFixed(2)}s`)

        // Randomize position
        const ix = Math.floor(Math.random() * lanesX.length)
        const iy = Math.floor(Math.random() * lanesY.length)
        deadObstacle.x = lanesX[ix]
        deadObstacle.y = lanesY[iy]
        deadObstacle.z = SPAWN_OBSTACLE_Z

        // Position the body at spawn location
        body.setTranslation({ x: deadObstacle.x, y: deadObstacle.y, z: deadObstacle.z }, true)

        // Set initial velocity in Z direction (toward camera/player)
        // Using setLinvel for consistent, even-paced movement
        const baseSpeed = speed * 0.5 // Increase speed - was 0.2
        const randomizedSpeed = baseSpeed * deadObstacle.velocity

        body.setLinvel({ x: 0, y: 0, z: randomizedSpeed }, true)

        console.log(`✅ VELOCITY ${obstacleIndex}:`, {
          baseSpeed,
          randomizedSpeed,
          velocityMultiplier: deadObstacle.velocity,
          position: { x: deadObstacle.x, y: deadObstacle.y, z: deadObstacle.z },
        })

        deadObstacle.isAlive = true
      }
    }

    // Check if alive obstacles are out of bounds for recycling
    obstacles.forEach((obstacle, i) => {
      if (obstacle.isAlive) {
        const body = rigidBodies.current![i]
        const currentPos = body.translation()

        if (currentPos.z > cameraZ + KILL_OBSTACLE_Z) {
          console.log(`♻️ Killing obstacle ${i}`)

          // Reset obstacle state
          obstacle.isAlive = false
          obstacle.velocity = 0.5 + Math.random() * 1.0 // New random velocity

          // Move body out of view and stop it
          body.setTranslation({ x: 0, y: 0, z: SPAWN_OBSTACLE_Z - 100 }, true)
          body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        }
      }
    })
  })

  return (
    <>
      {/* DEBUG: Log render-time state */}
      {console.log('🎨 Rendering Physics-based InstancedRigidBodies:', {
        maxObstacles,
        instances: instances.length,
        obstaclesData: obstaclesData.current.length,
      })}

      <InstancedRigidBodies
        ref={rigidBodies}
        instances={instances}
        type="dynamic" // Changed to dynamic for physics-based movement
        gravityScale={0} // No gravity - obstacles move by applied forces
        canSleep={false}
        sensor={true} // Still sensors for collision detection
        colliders="ball"
        // linearDamping={0.1} // Add some damping to slow down movement over time
        // angularDamping={0.1} // Prevent unwanted rotation
      >
        <instancedMesh args={[undefined, undefined, maxObstacles]} count={maxObstacles}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#fff" />
        </instancedMesh>
      </InstancedRigidBodies>
    </>
  )
}

export default Obstacles
