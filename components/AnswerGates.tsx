'use client'

import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import React, { type FC, useEffect, useRef } from 'react'

import type { Answer } from '@/data/questions'
import { type AnswerGateUserData } from '@/model/game'
import { useQuestionStore } from '@/stores/questionStore'
import { GameStage, KILL_OBSTACLE_Z, LANES_X, LANES_Y, SPAWN_OBSTACLE_Z, useGameStore } from '@/stores/useGameStore'

type AnswerGateProps = {
  position: [number, number, number]
  gateIndex: number
  answer: Answer | null
}

// Answer gate with physics collision
const AnswerGate = React.forwardRef<RapierRigidBody, AnswerGateProps>(({ answer, position }, ref) => {
  const hasAnswer = !!answer

  const userData: AnswerGateUserData = {
    type: 'answerGate',
    isCorrect: answer?.isCorrect ?? false,
  }

  return (
    <RigidBody
      ref={ref}
      type="dynamic"
      gravityScale={0}
      canSleep={false}
      colliders={false}
      position={position}
      userData={userData}>
      <CuboidCollider args={[1, 1, 0.05]} sensor={true} />

      {/* Only render visual elements if there's an answer to display (others are "nets" to catch misses) */}
      {hasAnswer && (
        <>
          {/* Flat box container */}
          <mesh>
            <boxGeometry args={[1.5, 0.8, 0.1]} />
            <meshStandardMaterial color={answer.isCorrect ? '#4ade80' : '#f87171'} transparent opacity={0.3} />
          </mesh>
          {/* Answer text */}
          <Text
            position={[0, 0, 0.06]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.4}
            textAlign="center">
            {answer.label}
          </Text>
        </>
      )}
    </RigidBody>
  )
})

AnswerGate.displayName = 'AnswerGate'

const gates = new Array(9).fill(null)
// Create all 9 gate positions (3x3 grid)
const generateGatePositions = (): [number, number, number][] => {
  const positions: [number, number, number][] = []
  for (let y = 0; y < LANES_Y.length; y++) {
    for (let x = 0; x < LANES_X.length; x++) {
      positions.push([LANES_X[x], LANES_Y[y], SPAWN_OBSTACLE_Z])
    }
  }
  return positions
}

const gatePositions = generateGatePositions()

const BASE_SPEED = 3.0

const AnswerGates: FC = () => {
  const currentQuestion = useQuestionStore((s) => s.currentQuestion)
  const goToNextQuestion = useQuestionStore((s) => s.goToNextQuestion)

  const gatesRefs = useRef<(RapierRigidBody | null)[]>(new Array(9).fill(null))
  const isRespawning = useRef(false)

  const stage = useGameStore((s) => s.stage)
  const isPlaying = stage === GameStage.PLAYING
  const obstaclesSpeed = useRef(useGameStore.getState().obstaclesSpeed) // Fetch initial state
  useEffect(
    () =>
      // Subscribe to state changes
      useGameStore.subscribe((state, prevState) => {
        if (!isPlaying) return
        if (state.obstaclesSpeed === prevState.obstaclesSpeed) return
        obstaclesSpeed.current = state.obstaclesSpeed
        gatesRefs.current.forEach((gate, index) => {
          if (!gate) return // Check for null ref
          const newSpeed = state.obstaclesSpeed * BASE_SPEED
          console.warn('Setting gate velocity:', { index, newSpeed })
          gate.setLinvel({ x: 0, y: 0, z: newSpeed }, true)
        })
      }),
    [isPlaying],
  )

  // Set velocity once when gates are created or speed changes
  useEffect(() => {
    const currentGates = gatesRefs.current // Capture refs at effect creation time

    const resetGatePositions = () => {
      currentGates.forEach((gate, index) => {
        if (!gate) return // Check for null ref
        try {
          const position = gatePositions[index]
          gate.setTranslation({ x: position[0], y: position[1], z: SPAWN_OBSTACLE_Z }, true)
          gate.setLinvel({ x: 0, y: 0, z: BASE_SPEED * obstaclesSpeed.current }, true)
        } catch (error) {
          console.warn(`Failed to set velocity for gate ${index}:`, error)
        }
      })
    }

    if (isPlaying) {
      resetGatePositions()
    }
  }, [isPlaying, currentQuestion])

  // Check lifecycle only
  useFrame(() => {
    if (!isPlaying) return
    // Check if gates have passed the kill zone and move to next question
    const firstGate = gatesRefs.current[0]
    if (!firstGate) return

    const gatesNeedKilling = firstGate.translation().z > KILL_OBSTACLE_Z

    if (gatesNeedKilling && !isRespawning.current) {
      console.log('Going to next question')
      isRespawning.current = true
      goToNextQuestion()
      // Reset the flag after a short delay to allow for next cycle
      setTimeout(() => {
        isRespawning.current = false
      }, 500)
      return
    }
  })

  // TODO: this should be pre-computed when the questions are loaded and then just read when the current index changes.
  // Map answers to specific gate positions based on answer count and layout strategy
  const getAnswerMapping = (): (Answer | null)[] => {
    const answers = currentQuestion.answers
    const numAnswers = answers.length
    const mapping = new Array(9).fill(null)

    if (numAnswers === 2) {
      // Two answers: left and right middle lanes (indices 3 and 5)
      mapping[3] = answers[0] // Left lane, middle row
      mapping[5] = answers[1] // Right lane, middle row
    } else if (numAnswers === 4) {
      // Four answers: diamond pattern (indices 1, 3, 5, 7)
      mapping[1] = answers[0] // Top middle
      mapping[3] = answers[1] // Left middle
      mapping[5] = answers[2] // Right middle
      mapping[7] = answers[3] // Bottom middle
    } else {
      // For other numbers, distribute sequentially (starting from top-left)
      answers.forEach((answer, index) => {
        if (index < 9) {
          mapping[index] = answer
        }
      })
    }

    console.log({ mapping })

    return mapping
  }

  const answerMapping = getAnswerMapping()

  return (
    <>
      {gates.map((_, gateIndex) => (
        <AnswerGate
          ref={(ref) => {
            gatesRefs.current[gateIndex] = ref
            if (ref) {
              console.warn(`Gate ${gateIndex} ref set successfully`)
            }
          }}
          key={gateIndex}
          answer={answerMapping[gateIndex]}
          position={gatePositions[gateIndex]}
          gateIndex={gateIndex}
        />
      ))}
    </>
  )
}

export default AnswerGates
