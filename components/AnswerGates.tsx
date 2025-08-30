'use client'

import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, type RapierRigidBody, RigidBody } from '@react-three/rapier'
import React, { type FC, useCallback, useEffect, useMemo, useRef } from 'react'

import type { Answer } from '@/data/questions'
import { useQuestionStore } from '@/stores/questionStore'
import { KILL_OBSTACLE_Z, LANES_X, LANES_Y, SPAWN_OBSTACLE_Z, useGameStore } from '@/stores/useGameStore'

type AnswerGateProps = {
  answer?: Answer // Optional now - gates can exist without answers
  position: [number, number, number]
  gateIndex: number
  onRefChange: (ref: RapierRigidBody | null) => void
}

// Answer gate with physics collision
const AnswerGate: FC<AnswerGateProps> = ({ answer, position, onRefChange }) => {
  const hasAnswer = !!answer

  return (
    <RigidBody ref={onRefChange} colliders={false} position={position}>
      <CuboidCollider
        args={[1, 1, 0.05]}
        onCollisionEnter={() => {
          console.log('Collided with answer gate', answer)
        }}
      />

      {/* Only render visual elements if there's an answer */}
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
}

const AnswerGates: FC = () => {
  const obstaclesSpeed = useGameStore((s) => s.obstaclesSpeed)
  const current = useQuestionStore((s) => s.current)
  const nextQuestion = useQuestionStore((s) => s.next)

  const gatesRef = useRef<(RapierRigidBody | null)[]>(new Array(9).fill(null))
  const hasPassedKillZone = useRef(false)

  const handleRefChange = useCallback(
    (index: number) => (ref: RapierRigidBody | null) => {
      gatesRef.current[index] = ref
    },
    [],
  )

  // Set velocity once when gates are created or speed changes
  useEffect(() => {
    gatesRef.current.forEach((gate) => {
      if (gate) {
        gate.setLinvel({ x: 0, y: 0, z: obstaclesSpeed }, true)
      }
    })
  }, [obstaclesSpeed, current.id]) // Re-run when speed changes or new question

  // Check lifecycle only
  useFrame(() => {
    // Check if gates have passed the kill zone and move to next question
    if (!gatesRef.current[0]) return
    const gatesNeedKilling = gatesRef.current[0].translation().z > KILL_OBSTACLE_Z

    if (gatesNeedKilling && !hasPassedKillZone.current) {
      hasPassedKillZone.current = true
      nextQuestion()

      // Reset the flag after a short delay to allow for next cycle
      setTimeout(() => {
        hasPassedKillZone.current = false
      }, 1000)
    }
  })

  // Create all 9 gate positions (3x3 grid)
  const allGatePositions: [number, number, number][] = useMemo(() => {
    const positions: [number, number, number][] = []
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        positions.push([LANES_X[x], LANES_Y[y], SPAWN_OBSTACLE_Z])
      }
    }
    return positions
  }, [])

  // Map answers to specific gate positions based on answer count and layout strategy
  const getAnswerMapping = (): (Answer | undefined)[] => {
    const answers = current.answers
    const numAnswers = answers.length
    const mapping = new Array(9).fill(undefined)

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

    return mapping
  }

  const answerMapping = getAnswerMapping()

  return (
    <>
      {allGatePositions.map((position, gateIndex) => (
        <AnswerGate
          key={`gate-${gateIndex}-${current.id}`}
          answer={answerMapping[gateIndex]}
          position={position}
          gateIndex={gateIndex}
          onRefChange={handleRefChange(gateIndex)}
        />
      ))}
    </>
  )
}

export default AnswerGates
