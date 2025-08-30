'use client'

import { useGSAP } from '@gsap/react'
import { useDidUpdate, usePrevious } from '@mantine/hooks'
import { useFrame } from '@react-three/fiber'
import { type IntersectionEnterHandler, type RapierRigidBody, RigidBody } from '@react-three/rapier'
import { gsap } from 'gsap'
import { type FC, useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'

import { type RigidBodyUserData } from '@/model/game'
import { useInputStore } from '@/stores/inputStore'
import { LANES_X, LANES_Y, MAX_HEALTH, useGameStore } from '@/stores/useGameStore'

gsap.registerPlugin(useGSAP)

const Player: FC = () => {
  const input = useInputStore()

  const health = useGameStore((s) => s.health)
  const prevHealth = usePrevious(health)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
  const onObstacleHit = useGameStore((s) => s.onObstacleHit)
  const onAnswerHit = useGameStore((s) => s.onAnswerHit)

  const laneXIndex = useRef(1)
  const laneYIndex = useRef(1)
  // current interpolated position
  const currentX = useRef(LANES_X[laneXIndex.current])
  const currentY = useRef(LANES_Y[laneYIndex.current])

  const bodyRef = useRef<RapierRigidBody>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  // remember previous input to detect key presses
  const prevInput = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  })

  // Intersection handler for sensor collisions
  const onIntersectionEnter: IntersectionEnterHandler = useCallback(
    (e) => {
      const { other } = e

      console.warn('Player intersected', { e })
      const otherRB = other.rigidBodyObject
      const otherCollider = other.colliderObject
      if (!otherRB?.userData) throw new Error('No userData on other rigid body')

      const userData = otherRB.userData as RigidBodyUserData
      const isObstacle = userData.type === 'obstacle' || otherCollider?.name === 'obstacle'
      const isAnswerGate = userData.type === 'answerGate'

      if (isObstacle) {
        onObstacleHit()
        return
      }

      if (isAnswerGate) {
        const isCorrect = userData.isCorrect
        onAnswerHit(isCorrect)
      }
    },
    [onObstacleHit, onAnswerHit],
  )

  // Handle health changes
  useDidUpdate(() => {
    const hasIncreased = health > (prevHealth ?? MAX_HEALTH)
    if (hasIncreased) {
      // Handle health increase (e.g., play sound, show effect)
      gsap.fromTo(materialRef.current!, { color: '#fff' }, { color: 'green', duration: 0.3, yoyo: true, repeat: 1 })
    } else {
      // Handle health decrease (e.g., play sound, show effect)
      gsap.fromTo(materialRef.current!, { color: '#fff' }, { color: '#f87171', duration: 0.3, yoyo: true, repeat: 1 })
      gsap.to(materialRef.current!, { opacity: 0.5, duration: 0.4, yoyo: true, repeat: 1 })
    }
  }, [health])

  // set the initial position once when the body is created
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.setTranslation({ x: currentX.current, y: currentY.current, z: 0 }, true)
    }
  }, [])

  useFrame((_, delta) => {
    if (!bodyRef.current) return

    // update lane indices on new key press
    if (input.left && !prevInput.current.left && laneXIndex.current > 0) {
      laneXIndex.current--
    }
    if (input.right && !prevInput.current.right && laneXIndex.current < LANES_X.length - 1) {
      laneXIndex.current++
    }
    if (input.up && !prevInput.current.up && laneYIndex.current < LANES_Y.length - 1) {
      laneYIndex.current++
    }
    if (input.down && !prevInput.current.down && laneYIndex.current > 0) {
      laneYIndex.current--
    }
    prevInput.current = { ...input }

    // target lane centre
    const targetX = LANES_X[laneXIndex.current]
    const targetY = LANES_Y[laneYIndex.current]

    // use damp to smooth toward the target; 5 is the damping factor
    currentX.current = THREE.MathUtils.damp(currentX.current, targetX, 5, delta)
    currentY.current = THREE.MathUtils.damp(currentY.current, targetY, 5, delta)

    // update the kinematic body’s translation
    bodyRef.current.setNextKinematicTranslation({
      x: currentX.current,
      y: currentY.current,
      z: 0,
    })

    // Store the current position in the global store
    setPlayerPosition([currentX.current, currentY.current, 0])
  })

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders="cuboid"
      gravityScale={0}
      sensor={true}
      onIntersectionEnter={onIntersectionEnter}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial ref={materialRef} color={'#fff'} transparent={true} opacity={1} />
      </mesh>
    </RigidBody>
  )
}

export default Player
