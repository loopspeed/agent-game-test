'use client'
import { useFrame } from '@react-three/fiber'
import { BallCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import { useInputStore } from '@/stores/useInputStore'

import { GROUND_HEIGHT, HEX_SIZE } from './Terrain'

const INITIAL_HEX_POSITION = { q: 0, r: 0 }
const Y_DAMPENING_MULTIPLIER = 1.2

// Axial to world coordinate conversion matching the honeycomb pattern
export function axialToWorld(q: number, r: number): [number, number] {
  // Pointy-top hexagon layout to match the SVG pattern
  const worldX = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r)
  const worldZ = HEX_SIZE * ((3 / 2) * r)
  return [worldX, worldZ]
}

export function heightAt(): number {
  return 0 // Flat surface for perfect hex alignment
}

export type PlayerProps = {
  axialRadius?: number
  yOffset?: number
  dampening?: number
  onHexCellChange?: (q: number, r: number) => void
}

const PlayerIndicator: React.FC<PlayerProps> = ({
  axialRadius = 20,
  yOffset = 2.0,
  dampening = 8,
  onHexCellChange,
}) => {
  const inputState = useInputStore()
  const currentHexPosition = useRef(INITIAL_HEX_POSITION)
  const currentWorldPosition = useRef(new THREE.Vector3(...axialToWorld(0, 0), 0))
  const targetWorldPosition = useRef(new THREE.Vector3(...axialToWorld(0, 0), 0))
  const previousInputState = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  })
  const rigidBodyReference = useRef<RapierRigidBody>(null)

  function isWithinBounds(q: number, r: number): boolean {
    const s = -q - r
    return Math.abs(q) <= axialRadius && Math.abs(r) <= axialRadius && Math.abs(s) <= axialRadius
  }

  useEffect(() => {
    if (!rigidBodyReference.current) return

    const [worldX, worldZ] = axialToWorld(currentHexPosition.current.q, currentHexPosition.current.r)
    const worldY = GROUND_HEIGHT + heightAt() + yOffset

    rigidBodyReference.current.setTranslation({ x: worldX, y: worldY, z: worldZ }, true)
    currentWorldPosition.current.set(worldX, worldY, worldZ)
    targetWorldPosition.current.set(worldX, worldY, worldZ)
    onHexCellChange?.(currentHexPosition.current.q, currentHexPosition.current.r)
  }, [yOffset, onHexCellChange])

  useFrame((_, deltaTime) => {
    const rigidBody = rigidBodyReference.current
    if (!rigidBody) return

    // Handle discrete hex movement on key press
    if (inputState.left && !previousInputState.current.left) {
      const newQ = currentHexPosition.current.q - 1
      if (isWithinBounds(newQ, currentHexPosition.current.r)) {
        currentHexPosition.current.q = newQ
      }
    }
    if (inputState.right && !previousInputState.current.right) {
      const newQ = currentHexPosition.current.q + 1
      if (isWithinBounds(newQ, currentHexPosition.current.r)) {
        currentHexPosition.current.q = newQ
      }
    }
    if (inputState.up && !previousInputState.current.up) {
      const newR = currentHexPosition.current.r - 1
      if (isWithinBounds(currentHexPosition.current.q, newR)) {
        currentHexPosition.current.r = newR
      }
    }
    if (inputState.down && !previousInputState.current.down) {
      const newR = currentHexPosition.current.r + 1
      if (isWithinBounds(currentHexPosition.current.q, newR)) {
        currentHexPosition.current.r = newR
      }
    }

    previousInputState.current = { ...inputState }
    onHexCellChange?.(currentHexPosition.current.q, currentHexPosition.current.r)

    // Calculate target world position
    const [targetX, targetZ] = axialToWorld(currentHexPosition.current.q, currentHexPosition.current.r)
    const targetY = GROUND_HEIGHT + heightAt() + yOffset
    targetWorldPosition.current.set(targetX, targetY, targetZ)

    // Smooth interpolation to target
    currentWorldPosition.current.x = THREE.MathUtils.damp(
      currentWorldPosition.current.x,
      targetWorldPosition.current.x,
      dampening,
      deltaTime,
    )
    currentWorldPosition.current.y = THREE.MathUtils.damp(
      currentWorldPosition.current.y,
      targetWorldPosition.current.y,
      dampening * Y_DAMPENING_MULTIPLIER,
      deltaTime,
    )
    currentWorldPosition.current.z = THREE.MathUtils.damp(
      currentWorldPosition.current.z,
      targetWorldPosition.current.z,
      dampening,
      deltaTime,
    )

    rigidBody.setNextKinematicTranslation({
      x: currentWorldPosition.current.x,
      y: currentWorldPosition.current.y,
      z: currentWorldPosition.current.z,
    })
  })

  return (
    <RigidBody ref={rigidBodyReference} type="kinematicPosition" colliders={false}>
      <BallCollider args={[1.5]} sensor />
      <mesh>
        <sphereGeometry args={[2.2, 20, 20]} />
        <meshStandardMaterial
          color="#00ff44"
          emissive="#00ff44"
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
    </RigidBody>
  )
}

export default PlayerIndicator
