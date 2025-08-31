'use client'

import { useGSAP } from '@gsap/react'
import { useDidUpdate, usePrevious } from '@mantine/hooks'
import { useFrame } from '@react-three/fiber'
import { type IntersectionEnterHandler, type RapierRigidBody, RigidBody } from '@react-three/rapier'
import { gsap } from 'gsap'
import { type FC, useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'

import { type RigidBodyUserData } from '@/model/game'
import { LANES_X, LANES_Y, LANES_Y_OFFSET, useGameStore } from '@/stores/GameProvider'
import { useInputStore } from '@/stores/useInputStore'

gsap.registerPlugin(useGSAP)

const Player: FC = () => {
  const input = useInputStore()

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

  const { contextSafe } = useGSAP({})

  // Intersection handler for sensor collisions
  const onIntersectionEnter: IntersectionEnterHandler = contextSafe((e) => {
    const { other } = e

    console.warn('Player intersected', { e })
    const otherRB = other.rigidBody
    if (!otherRB?.userData) throw new Error('No userData on other rigid body')

    const userData = otherRB.userData as RigidBodyUserData
    const isObstacle = userData.type === 'obstacle'
    const isAnswerGate = userData.type === 'answerGate'

    const defaultColor = new THREE.Color('#fff')

    const handleBadHit = () => {
      const badColor = new THREE.Color('#f00')
      gsap.to(materialRef.current!.color, {
        r: badColor.r,
        g: badColor.g,
        b: badColor.b,
        duration: 0.2,
        onComplete: () => {
          gsap.to(materialRef.current!.color, {
            r: defaultColor.r,
            g: defaultColor.g,
            b: defaultColor.b,
            duration: 0.2,
            delay: 0.3,
          })
        },
      })
    }

    const handleGoodHit = () => {
      const goodColor = new THREE.Color('#4ade80')
      gsap.to(materialRef.current!.color, {
        r: goodColor.r,
        g: goodColor.g,
        b: goodColor.b,
        duration: 0.2,
        onComplete: () => {
          gsap.to(materialRef.current!.color, {
            r: defaultColor.r,
            g: defaultColor.g,
            b: defaultColor.b,
            duration: 0.2,
            delay: 0.3,
          })
        },
      })
    }

    if (isObstacle) {
      console.warn('Player hit obstacle', userData)
      onObstacleHit()
      handleBadHit()
    }

    if (isAnswerGate) {
      console.warn('Player hit answer gate', userData)
      const isCorrect = userData.isCorrect
      onAnswerHit(isCorrect)
      if (isCorrect) handleGoodHit()
      else handleBadHit()
    }
  })

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

    // Store the current position in the global store (do we need to do this?)
    setPlayerPosition([currentX.current, currentY.current, 0])
  })

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders="cuboid"
      gravityScale={0}
      sensor={true}
      canSleep={false}
      onIntersectionEnter={onIntersectionEnter}
      userData={{
        type: 'player',
      }}>
      <mesh>
        <boxGeometry args={[0.6, 0.3, 0.6]} />
        <meshBasicMaterial ref={materialRef} color={'#fff'} transparent={true} opacity={1} />
      </mesh>
    </RigidBody>
  )
}

export default Player
