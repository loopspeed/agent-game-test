import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import React, { type FC, useEffect, useRef } from 'react'

import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { CAMERA_FAR, GRID_SQUARE_SIZE_M } from '@/stores/GameProvider'

import tunnelFragment from './tunnel.frag'
import tunnelVertex from './tunnel.vert'

const MAX_RAYS = 12
const RAY_SPAWN_INTERVAL = 1.0 // seconds between spawns
const RAY_LIFETIME = 8.0 // seconds before ray despawns (used in shader)

type RayData = {
  startX: number
  startY: number
  spawnTime: number
  isActive: boolean
}

type Uniforms = {
  uTime: number
  uRayPositions: Float32Array
  uRayData: Float32Array
  uMaxRays: number
  uRayLifetime: number
}

const TUNNEL_UNIFORMS: Uniforms = {
  uTime: 0,
  uRayPositions: new Float32Array(MAX_RAYS * 2), // x, y pairs
  uRayData: new Float32Array(MAX_RAYS * 2), // spawnTime, isActive pairs
  uMaxRays: MAX_RAYS,
  uRayLifetime: RAY_LIFETIME,
}

// Create custom shader material following the same pattern as PlayerParticles
const CustomTunnelShaderMaterial = shaderMaterial(TUNNEL_UNIFORMS, tunnelVertex, tunnelFragment)
const TunnelShaderMaterial = extend(CustomTunnelShaderMaterial)

const TUNNEL_RADIUS = GRID_SQUARE_SIZE_M * 4 // Large enough to wrap around the 3x3 grid
const TUNNEL_LENGTH = CAMERA_FAR * 2
const TUNNEL_SEGMENTS = 32

const Tunnel: FC = () => {
  const shaderMaterial = React.useRef<typeof TunnelShaderMaterial & Uniforms>(null)
  const { gameTime } = useTimeSubscription()

  const rays = useRef<RayData[]>(
    Array.from({ length: MAX_RAYS }, () => ({
      startX: 0,
      startY: 0,
      spawnTime: 0,
      isActive: false,
    })),
  )

  const lastSpawnTime = useRef(0)
  const rayPositions = useRef(new Float32Array(MAX_RAYS * 2))
  const rayData = useRef(new Float32Array(MAX_RAYS * 2))

  const spawnRay = (currentTime: number) => {
    const inactiveRayIndex = rays.current.findIndex((ray) => !ray.isActive)
    if (inactiveRayIndex === -1) return // No available slots

    // Generate random position on tunnel circumference
    const angle = Math.random() * Math.PI * 2
    const radius = TUNNEL_RADIUS * 0.98 // Slightly inside the tunnel wall

    rays.current[inactiveRayIndex] = {
      startX: Math.cos(angle) * radius,
      startY: Math.sin(angle) * radius,
      spawnTime: currentTime,
      isActive: true,
    }
  }

  const updateRays = (currentTime: number) => {
    // Spawn new rays
    if (currentTime - lastSpawnTime.current > RAY_SPAWN_INTERVAL) {
      spawnRay(currentTime)
      lastSpawnTime.current = currentTime
    }

    // Update ray data
    rays.current.forEach((ray, index) => {
      if (ray.isActive) {
        const age = currentTime - ray.spawnTime
        if (age > RAY_LIFETIME) {
          ray.isActive = false
        }
      }

      // Update uniform arrays
      rayPositions.current[index * 2] = ray.startX
      rayPositions.current[index * 2 + 1] = ray.startY
      rayData.current[index * 2] = ray.spawnTime
      rayData.current[index * 2 + 1] = ray.isActive ? 1.0 : 0.0
    })
  }

  useEffect(() => {
    // Initialize first ray
    spawnRay(0)
  }, [])

  useFrame(() => {
    if (!shaderMaterial.current) return

    const currentTime = gameTime.current
    updateRays(currentTime)

    shaderMaterial.current.uTime = currentTime
    shaderMaterial.current.uRayPositions = rayPositions.current
    shaderMaterial.current.uRayData = rayData.current
    shaderMaterial.current.uMaxRays = MAX_RAYS
    shaderMaterial.current.uRayLifetime = RAY_LIFETIME
  })

  return (
    <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry
        args={[
          TUNNEL_RADIUS, // radiusTop
          TUNNEL_RADIUS, // radiusBottom
          TUNNEL_LENGTH, // height (length along Y-axis, but we rotate it to Z)
          TUNNEL_SEGMENTS, // radialSegments
          1, // heightSegments
          true, // openEnded - open at both ends
        ]}
      />
      <TunnelShaderMaterial key={CustomTunnelShaderMaterial.key} ref={shaderMaterial} side={1} />
    </mesh>
  )
}

export default Tunnel
