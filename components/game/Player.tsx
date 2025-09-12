'use client'

import { useGSAP } from '@gsap/react'
import { useFrame } from '@react-three/fiber'
import { type IntersectionEnterHandler, type RapierRigidBody, RigidBody } from '@react-three/rapier'
import { gsap } from 'gsap'
import { type FC, useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'

import { RigidBodyType, type RigidBodyUserData } from '@/model/game'
import { LANES_X, LANES_Y, useGameStore } from '@/stores/GameProvider'
import { useLevelStore } from '@/stores/LevelProvider'
import { type InputState, useInputStore } from '@/stores/useInputStore'

gsap.registerPlugin(useGSAP)

const Player: FC = () => {
  const input = useInputStore()

  const onObstacleHit = useGameStore((s) => s.onObstacleHit)
  const onObstacleAvoided = useGameStore((s) => s.onObstacleAvoided)
  const onAnswerHit = useGameStore((s) => s.onAnswerHit)
  const updatePlayerPosition = useLevelStore((s) => s.updatePlayerPosition)

  const laneXIndex = useRef(1)
  const laneYIndex = useRef(1)
  // current interpolated position
  const currentX = useRef(LANES_X[laneXIndex.current])
  const currentY = useRef(LANES_Y[laneYIndex.current])

  const bodyRef = useRef<RapierRigidBody>(null)

  // Intersection handler for sensor collisions
  const onIntersectionEnter: IntersectionEnterHandler = useCallback(
    (e) => {
      const { other } = e
      const otherRB = other.rigidBody
      if (!otherRB?.userData) throw new Error('No userData on other rigid body')

      const userData = otherRB.userData as RigidBodyUserData
      const isObstacle = userData.type === RigidBodyType.OBSTACLE
      const isObstacleAvoided = userData.type === RigidBodyType.OBSTACLE_AVOIDED
      const isAnswerGate = userData.type === RigidBodyType.ANSWER_GATE

      if (isObstacle) {
        onObstacleHit(userData)
        return
      }

      if (isObstacleAvoided) {
        onObstacleAvoided(userData)
        return
      }

      if (isAnswerGate) {
        onAnswerHit(userData)
        return
      }
    },
    [onAnswerHit, onObstacleAvoided, onObstacleHit],
  )

  // set the initial position once when the body is created
  useEffect(() => {
    if (!bodyRef.current) return
    bodyRef.current.setTranslation({ x: currentX.current, y: currentY.current, z: 0 }, true)
  }, [])

  // Track previous input to detect key presses
  // TODO: this should be tracked inside the STORE instead to be more deterministic
  const prevInput = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
  })

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

    updatePlayerPosition({
      pos: [currentX.current, currentY.current, 0],
      lanes: [laneXIndex.current, laneYIndex.current],
    })
  })

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders="ball"
      gravityScale={0}
      sensor={true}
      canSleep={false}
      onIntersectionEnter={onIntersectionEnter}
      userData={{
        type: 'player',
      }}>
      <PlayerModel />
    </RigidBody>
  )
}

export default Player

const PlayerModel: FC = () => {
  const scoreEvents = useGameStore((s) => s.scoreEvents)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useEffect(() => {
    // Handle the most recent score event
    if (!materialRef.current) return
    if (scoreEvents.length === 0) return
    const latestEvent = scoreEvents[scoreEvents.length - 1]

    const defaultColor = new THREE.Color('#ffffff')
    const goodColor = new THREE.Color('#4ade80')
    const badColor = new THREE.Color('#f00')

    const handleBadHit = () => {
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

    if (latestEvent.type === 'hit') {
      handleBadHit()
    } else if (latestEvent.type === 'avoided') {
      handleGoodHit()
    }
  }, [scoreEvents])

  return (
    <mesh>
      <sphereGeometry args={[0.24, 32, 32]} />
      <meshStandardMaterial ref={materialRef} color={'#fff'} transparent={true} opacity={1} />
    </mesh>
  )
}
