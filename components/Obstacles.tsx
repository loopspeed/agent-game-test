'use client'
import { useFrame } from '@react-three/fiber'
import { InstancedRigidBodies, type InstancedRigidBodyProps, type RapierRigidBody } from '@react-three/rapier'
import { type FC, useEffect, useMemo, useRef } from 'react'

import { GameStage, KILL_OBSTACLE_Z, LANES_X, LANES_Y, SPAWN_OBSTACLE_Z, useGameStore } from '@/stores/useGameStore'

/**
 * UNIFIED PHYSICS-BASED OBSTACLES SYSTEM
 *
 * This component uses dynamic rigid bodies with applied forces.
 * Key features:
 * - Mutable obstacle data stored in refs (separate from React's memo system)
 * - Immutable instance data generated via useMemo
 * - Simple isAlive boolean state management
 * - Each obstacle gets a random velocity multiplier (0.5x to 1.5x base speed)
 * - Uses setLinvel() for consistent movement toward camera
 * - Controlled spawning based on spawnInterval setting
 * - Obstacles are recycled when they go out of bounds
 */

type ObstacleData = {
  x: number
  y: number
  z: number
  isAlive: boolean
  velocity: number // Random velocity multiplier
}

const Obstacles: FC = () => {
  const maxObstacles = useGameStore((s) => s.maxObstacles)
  const obstaclesSpeed = useGameStore((s) => s.obstaclesSpeed)
  const spawnInterval = useGameStore((s) => s.spawnInterval)
  const stage = useGameStore((s) => s.stage)
  const isPlaying = stage === GameStage.PLAYING

  // Create obstacle instances (immutable) - these set the initial physics body positions
  const obstacleInstances = useMemo(() => {
    console.log('🏗️ Generating obstacle instances:', { maxObstacles })
    const instances: InstancedRigidBodyProps[] = []

    for (let i = 0; i < maxObstacles; i++) {
      // Initial position for each physics body - start hidden far away
      const x = LANES_X[i % LANES_X.length]
      const y = LANES_Y[Math.floor(i / LANES_X.length) % LANES_Y.length]

      instances.push({
        key: `obstacle_${i}`,
        position: [x, y, SPAWN_OBSTACLE_Z - 100], // Start hidden far away behind spawn
        userData: { kind: 'obstacle', index: i },
      })
    }

    return instances
  }, [maxObstacles])

  // Store mutable obstacle data in ref (separate from React's memo system)
  const obstaclesData = useRef<ObstacleData[]>([])

  // Initialize obstacle data when maxObstacles or lanes change
  useEffect(() => {
    console.log('🔄 Initializing obstacle data:', { maxObstacles })
    const newData: ObstacleData[] = []

    for (let i = 0; i < maxObstacles; i++) {
      newData.push({
        x: LANES_X[i % LANES_X.length],
        y: LANES_Y[Math.floor(i / LANES_X.length) % LANES_Y.length],
        z: SPAWN_OBSTACLE_Z,
        isAlive: false,
        velocity: 0.5 + Math.random() * 1.0,
      })
    }

    obstaclesData.current = newData

    // Reset game time when obstacles are regenerated
    gameTime.current = 0
    lastSpawnTime.current = 0

    // Reset all physics bodies to their initial positions
    if (rigidBodies.current) {
      rigidBodies.current.forEach((body, i) => {
        if (body && i < newData.length) {
          // Reset to initial hidden position
          body.setTranslation({ x: newData[i].x, y: newData[i].y, z: SPAWN_OBSTACLE_Z - 100 }, true)
          body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        }
      })
    }

    console.log('🔄 Obstacles data initialized and game time reset')
  }, [maxObstacles])

  // Reset all obstacles when game starts/stops
  useEffect(() => {
    if (!isPlaying) {
      gameTime.current = 0
      lastSpawnTime.current = 0 // Reset spawn timing
      console.log('🛑 Game stopped - resetting obstacle system')

      // Reset all obstacle states
      obstaclesData.current.forEach((obstacle, i) => {
        obstacle.isAlive = false
        obstacle.velocity = 0.5 + Math.random() * 1.0

        // Reset physics bodies if available
        if (rigidBodies.current?.[i]) {
          const body = rigidBodies.current[i]
          body.setTranslation({ x: obstacle.x, y: obstacle.y, z: SPAWN_OBSTACLE_Z - 100 }, true)
          body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        }
      })
    } else {
      console.log('🎮 Game started - obstacle spawning enabled')

      // TEMPORARY: Force spawn one obstacle immediately for testing
      if (obstaclesData.current.length > 0 && rigidBodies.current) {
        const testObstacle = obstaclesData.current[0]
        const testBody = rigidBodies.current[0]
        if (testBody && !testObstacle.isAlive) {
          console.log('🧪 SPAWNING TEST OBSTACLE for visibility check')
          testObstacle.isAlive = true
          testObstacle.x = 0 // Center position
          testObstacle.y = 0
          testObstacle.z = SPAWN_OBSTACLE_Z
          testBody.setTranslation({ x: 0, y: 0, z: SPAWN_OBSTACLE_Z }, true)
          // Positive Z velocity to move toward camera
          testBody.setLinvel({ x: 0, y: 0, z: obstaclesSpeed }, true)
          console.log('🧪 TEST OBSTACLE spawned with velocity:', obstaclesSpeed)
        }
      }
    }
  }, [isPlaying, obstaclesSpeed])

  // DEBUG: Add a simple state logger
  const frameCount = useRef(0)

  // Ref for the instanced rigid bodies
  const rigidBodies = useRef<RapierRigidBody[]>(null)
  const gameTime = useRef(0) // Track total game time for staggered spawning
  const lastSpawnTime = useRef(0) // Track when we last spawned an obstacle

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

    // Controlled spawning: find first dead obstacle and spawn it based on spawnInterval
    const deadObstacle = obstacles.find((o) => !o.isAlive)
    const timeSinceLastSpawn = gameTime.current - lastSpawnTime.current

    if (deadObstacle && gameTime.current >= 1.0 && timeSinceLastSpawn >= spawnInterval) {
      // Start spawning after 1 second and respect spawn interval
      const obstacleIndex = obstacles.indexOf(deadObstacle)
      const body = rigidBodies.current[obstacleIndex]

      if (body) {
        lastSpawnTime.current = gameTime.current // Update last spawn time
        console.log(`🚀 SPAWN ${obstacleIndex} at time ${gameTime.current.toFixed(2)}s`)

        // Randomize position
        const ix = Math.floor(Math.random() * LANES_X.length)
        const iy = Math.floor(Math.random() * LANES_Y.length)
        deadObstacle.x = LANES_X[ix]
        deadObstacle.y = LANES_Y[iy]
        deadObstacle.z = SPAWN_OBSTACLE_Z

        // Position the body at spawn location (this should make it visible)
        body.setTranslation({ x: deadObstacle.x, y: deadObstacle.y, z: deadObstacle.z }, true)

        // Set initial velocity in Z direction (toward camera/player)
        // Using setLinvel for consistent, even-paced movement
        // IMPORTANT: Positive Z velocity moves TOWARD camera (since camera is at positive Z)
        const randomizedSpeed = obstaclesSpeed * deadObstacle.velocity

        body.setLinvel({ x: 0, y: 0, z: randomizedSpeed }, true)

        console.log(`✅ SPAWNED ${obstacleIndex}:`, {
          randomizedSpeed,
          velocityMultiplier: deadObstacle.velocity,
          position: { x: deadObstacle.x, y: deadObstacle.y, z: deadObstacle.z },
          actualBodyPos: body.translation(),
          actualBodyVel: body.linvel(),
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
        instances: obstacleInstances.length,
        obstaclesData: obstaclesData.current,
        sampleInstance: obstacleInstances[0],
        aliveCount: obstaclesData.current.filter((o) => o.isAlive).length,
      })}

      {/* TEST: Simple mesh to verify rendering works */}
      <mesh position={[0, 2, -10]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>

      <InstancedRigidBodies
        ref={rigidBodies}
        instances={obstacleInstances}
        type="dynamic" // Dynamic bodies for physics movement
        gravityScale={0} // No gravity - obstacles move by applied forces
        canSleep={false} // Keep bodies awake to ensure they keep moving
        sensor={false} // NOT sensors - they should be solid and visible
        colliders="ball">
        <instancedMesh args={[undefined, undefined, maxObstacles]} count={maxObstacles}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#fff" />
        </instancedMesh>
      </InstancedRigidBodies>
    </>
  )
}

export default Obstacles
