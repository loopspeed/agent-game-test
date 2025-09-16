import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import React, { type FC, useEffect, useRef } from 'react'
import { Color } from 'three'

import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { CAMERA_FAR, GRID_SQUARE_SIZE_M } from '@/stores/LevelProvider'

import tunnelFragment from './tunnel.frag'
import tunnelVertex from './tunnel.vert'

const MAX_RAYS = 12 // NOTE IF CHANGE: update Fragment shader uniforms
const RAY_SPAWN_INTERVAL = 1.0 // seconds between spawns

// Array of different ray colors for variety - blue, cyan, green range
const RAY_COLORS = [
  new Color(0x00ffff), // Cyan
  new Color(0x0080ff), // Bright Blue
  new Color(0x00ff80), // Spring Green
  new Color(0x40e0d0), // Turquoise
  new Color(0x0066cc), // Deep Blue
  new Color(0x00cc66), // Emerald Green
  new Color(0x80e0ff), // Light Cyan
  new Color(0x4040ff), // Electric Blue
  new Color(0x66ff66), // Bright Green
  new Color(0x20b2aa), // Light Sea Green
  new Color(0x0099ff), // Azure
  new Color(0x00ffaa), // Mint Green
].map((color) => [color.r, color.g, color.b]) // Convert to RGB arrays

type RayData = {
  startX: number
  startY: number
  spawnTime: number
  lifetime: number
  isActive: boolean
}

type Uniforms = {
  uTime: number
  uRayPositions: Float32Array
  uRayTimes: Float32Array
  uMaxRays: number
  uRayColors: Float32Array
}

const TUNNEL_UNIFORMS: Uniforms = {
  uTime: 0,
  uRayPositions: new Float32Array(MAX_RAYS * 2), // x, y pairs
  uRayTimes: new Float32Array(MAX_RAYS * 3), // spawnTime, lifetime, isActive triplets
  uMaxRays: MAX_RAYS,
  uRayColors: new Float32Array(RAY_COLORS.flat()), // flatten RGB values
}

// Create custom shader material following the same pattern as PlayerParticles
const CustomTunnelShaderMaterial = shaderMaterial(TUNNEL_UNIFORMS, tunnelVertex, tunnelFragment)
const TunnelShaderMaterial = extend(CustomTunnelShaderMaterial)

const TUNNEL_RADIUS = GRID_SQUARE_SIZE_M * 4 // Large enough to wrap around the 3x3 grid
const TUNNEL_LENGTH = CAMERA_FAR * 2
const TUNNEL_SEGMENTS = 32

const Tunnel: FC = () => {
  const shaderMaterial = React.useRef<typeof TunnelShaderMaterial & Uniforms>(null)
  const { totalTime } = useTimeSubscription()

  const rays = useRef<RayData[]>(
    Array.from({ length: MAX_RAYS }, () => ({
      startX: 0,
      startY: 0,
      spawnTime: 0,
      lifetime: 0,
      isActive: false,
    })),
  )

  const lastSpawnTime = useRef(0)
  const rayPositions = useRef(new Float32Array(MAX_RAYS * 2))
  const rayData = useRef(new Float32Array(MAX_RAYS * 3)) // Now holds spawnTime, lifetime, isActive

  const spawnRay = (currentTime: number) => {
    const inactiveRayIndex = rays.current.findIndex((ray) => !ray.isActive)
    if (inactiveRayIndex === -1) return // No available slots

    // Generate random position on tunnel circumference
    const angle = Math.random() * Math.PI * 2
    const radius = TUNNEL_RADIUS * 0.98 // Slightly inside the tunnel wall

    // Generate random lifetime between 4 and 12 seconds
    const lifetime = 4 + Math.random() * 8 // 4 + (0 to 8) = 4 to 12 seconds

    rays.current[inactiveRayIndex] = {
      startX: Math.cos(angle) * radius,
      startY: Math.sin(angle) * radius,
      spawnTime: currentTime,
      lifetime: lifetime,
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
        if (age > ray.lifetime) {
          // Use individual ray lifetime
          ray.isActive = false
        }
      }

      // Update uniform arrays (now with 3 values per ray: spawnTime, lifetime, isActive)
      rayPositions.current[index * 2] = ray.startX
      rayPositions.current[index * 2 + 1] = ray.startY
      rayData.current[index * 3] = ray.spawnTime
      rayData.current[index * 3 + 1] = ray.lifetime
      rayData.current[index * 3 + 2] = ray.isActive ? 1.0 : 0.0
    })
  }

  useEffect(() => {
    // Initialize first ray
    spawnRay(0)
  }, [])

  useFrame(() => {
    if (!shaderMaterial.current) return

    const currentTime = totalTime.current
    updateRays(currentTime)

    shaderMaterial.current.uTime = currentTime
    shaderMaterial.current.uRayPositions = rayPositions.current
    shaderMaterial.current.uRayTimes = rayData.current
    shaderMaterial.current.uMaxRays = MAX_RAYS
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
      <TunnelShaderMaterial
        key={CustomTunnelShaderMaterial.key}
        ref={shaderMaterial}
        side={1}
        defines={{
          MAX_RAYS: MAX_RAYS,
        }}
      />
    </mesh>
  )
}

export default Tunnel
