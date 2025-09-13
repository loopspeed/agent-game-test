'use client'
import { Text } from '@react-three/drei'
import { CuboidCollider, type IntersectionEnterHandler, RapierRigidBody, RigidBody } from '@react-three/rapier'
import React, { type FC, useState } from 'react'

import { LevelPhase, type OnboardingTargetUserData, RigidBodyType, type RigidBodyUserData } from '@/model/game'
import { FONTS } from '@/resources/fonts'
import { GRID_SQUARE_SIZE_M, LANES_X, LANES_Y } from '@/stores/GameProvider'
import { useLevelStore } from '@/stores/LevelProvider'

type TargetProps = {
  position: [number, number, number]
  laneIndex: number
  opacity: number
  isCompleted: boolean
  textLabel: string
  onIntersectionEnter: IntersectionEnterHandler
}

const OnboardingTarget = React.forwardRef<RapierRigidBody, TargetProps>(
  ({ position, laneIndex, opacity = 0, isCompleted = false, textLabel = '', onIntersectionEnter }, ref) => {
    const userData: OnboardingTargetUserData = {
      type: RigidBodyType.ONBOARDING_TARGET,
      cubeId: `onboarding-target-${laneIndex}`,
      laneIndex,
    }

    // Determine visual properties based on state
    const color = isCompleted ? '#10b981' : '#3b82f6' // Green for completed, blue for target

    return (
      <RigidBody
        ref={ref}
        type="dynamic"
        gravityScale={0}
        canSleep={false}
        colliders="cuboid"
        position={position}
        userData={userData}
        sensor={true}
        onIntersectionEnter={onIntersectionEnter}>
        <mesh>
          <boxGeometry args={[GRID_SQUARE_SIZE_M, GRID_SQUARE_SIZE_M, 0.02]} />
          <meshStandardMaterial color={color} transparent={true} opacity={opacity} />
        </mesh>
        {/* Not well optimised, should be a different component */}
        <Text
          position={[0, 0, 0.12]}
          fontSize={0.4}
          font={FONTS['Roboto']}
          fontWeight={'black'}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.8}
          textAlign="center">
          {textLabel}
        </Text>
      </RigidBody>
    )
  },
)

OnboardingTarget.displayName = 'IntroCube'

// Define the sequence of lanes to visit starting from center (index 4)
const ONBOARDING_SEQUENCE = [1, 0, 3, 6, 7, 8, 5, 2, 4]

const Onboarding: FC = () => {
  const isOnboardingPhase = useLevelStore((s) => s.phase === LevelPhase.ONBOARDING)
  const onOnboardingPhaseCompleted = useLevelStore((s) => s.onOnboardingPhaseCompleted)

  // const cubesRefs = useRef<(RapierRigidBody | null)[]>(new Array(9).fill(null))

  // State for tracking the onboarding sequence
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0)
  const [completedLanes, setCompletedLanes] = useState<Set<number>>(new Set())
  const currentTargetLane = ONBOARDING_SEQUENCE[currentTargetIndex]

  const onIntersectionEnter: IntersectionEnterHandler = (args) => {
    const { other, target } = args
    const otherRB = other.rigidBody
    if (!otherRB?.userData) return

    // Check if it's the player intersecting
    const userData = otherRB.userData as RigidBodyUserData
    if (userData.type !== RigidBodyType.PLAYER) return

    // Get the cube that was intersected
    const cubeUserData = target.rigidBody?.userData as OnboardingTargetUserData
    if (!cubeUserData || cubeUserData.type !== RigidBodyType.ONBOARDING_TARGET) return

    const enteredLaneIndex = cubeUserData.laneIndex
    if (enteredLaneIndex !== currentTargetLane) return // Not the current target
    if (completedLanes.has(enteredLaneIndex)) return // Already entered this lane

    // Move to next target in sequence
    if (currentTargetIndex < ONBOARDING_SEQUENCE.length - 1) {
      // Mark this lane as completed
      setCompletedLanes((prev) => new Set([...prev, currentTargetLane]))
      setCurrentTargetIndex((prev) => prev + 1)
    } else {
      onOnboardingPhaseCompleted()
    }
  }

  if (!isOnboardingPhase) return null

  return (
    <>
      {cubePositions.map((position, index) => {
        const isCurrentTarget = index === currentTargetLane
        const isNextTarget = index === ONBOARDING_SEQUENCE?.[currentTargetIndex + 1] || false
        const isNextNextTarget = index === ONBOARDING_SEQUENCE?.[currentTargetIndex + 2] || false
        const isCompleted = completedLanes.has(index)
        const opacity = isCurrentTarget ? 1 : isNextTarget ? 0.3 : isNextNextTarget ? 0.15 : isCompleted ? 1 : 0

        return (
          <OnboardingTarget
            key={index}
            position={position}
            laneIndex={index}
            opacity={opacity}
            isCompleted={isCompleted}
            textLabel={isCurrentTarget && index === 4 ? 'GO!' : ''}
            onIntersectionEnter={onIntersectionEnter}
          />
        )
      })}
    </>
  )
}

// Cube position generation - 9 cubes (one in each lane) at z = 0
const generateCubePositions = (): [number, number, number][] => {
  const positions: [number, number, number][] = []
  for (let y = 0; y < LANES_Y.length; y++) {
    for (let x = 0; x < LANES_X.length; x++) {
      positions.push([LANES_X[x], LANES_Y[y], 0])
    }
  }
  return positions
}

const cubePositions = generateCubePositions()

export default Onboarding
