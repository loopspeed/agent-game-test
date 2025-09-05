/**
 * RhythmAnswerGates Component
 *
 * Example implementation showing how to replace the old answer gate system
 * with the new rhythm-based approach. This demonstrates timed, structured
 * answer gate placement instead of random intervals.
 */

'use client'

import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, type IntersectionEnterPayload, RapierRigidBody, RigidBody } from '@react-three/rapier'
import gsap from 'gsap'
import React, { type FC, useEffect, useRef } from 'react'

import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { useRhythmSystem, type RhythmAnswerGateData } from '@/hooks/useRhythmSystem'
import { type AnswerGateUserData, type RigidBodyUserData } from '@/model/game'
import {
  GameStage,
  GRID_SQUARE_SIZE_M,
  KILL_OBSTACLE_Z,
  LANES_X,
  LANES_Y,
  SPAWN_OBSTACLE_Z,
  useGameStore,
} from '@/stores/GameProvider'

type AnswerGateProps = {
  position: [number, number, number]
  index: number
  rhythmData?: RhythmAnswerGateData
}

const RhythmAnswerGate = React.forwardRef<RapierRigidBody, AnswerGateProps>(({ index, position, rhythmData }, ref) => {
  // Use rhythm data if available, otherwise fall back to current system
  const currentAnswerMapping = useGameStore((s) => s.answerGatesMapping[s.currentQuestionIndex])
  const answer = rhythmData?.answerMapping[index] || currentAnswerMapping[index]

  const userData: AnswerGateUserData = {
    type: 'answerGate',
    isCorrect: answer?.isCorrect ?? false,
    answerId: answer?.id ?? '',
  }

  const material = useRef(null)

  const onIntersectionEnter = (e: IntersectionEnterPayload) => {
    if (!e.other?.rigidBody?.userData) throw new Error('Invalid userData')
    const { type } = e.other.rigidBody.userData as RigidBodyUserData

    if (type === 'player') {
      // Enhanced visual feedback for rhythm-based gates
      gsap.to(material.current, {
        opacity: 1.0,
        duration: 0.16,
        onComplete: () => {
          gsap.to(material.current, {
            opacity: 0.4,
            duration: 0.12,
          })
        },
      })

      // Log rhythm context for debugging
      if (rhythmData) {
        console.warn('🎵 RHYTHM ANSWER GATE HIT:', {
          questionId: rhythmData.question.id,
          answerId: answer?.id,
          isCorrect: answer?.isCorrect,
          spawnTime: rhythmData.spawnTime,
          runUpDuration: rhythmData.runUpDuration,
        })
      }
    }
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
      <CuboidCollider
        args={[GRID_SQUARE_SIZE_M / 2, GRID_SQUARE_SIZE_M / 2, 0.05]}
        sensor={true}
        onIntersectionEnter={onIntersectionEnter}
      />

      {/* Visual elements */}
      {!!answer && (
        <>
          <mesh>
            <boxGeometry args={[GRID_SQUARE_SIZE_M, GRID_SQUARE_SIZE_M, 0.1]} />
            <meshStandardMaterial
              ref={material}
              color={answer.isCorrect ? '#4ade80' : '#f87171'}
              transparent={true}
              opacity={rhythmData ? 0.6 : 0.4} // Slightly more opaque for rhythm gates
            />
          </mesh>
          <Text
            position={[0, 0, 0.1]}
            fontSize={0.2}
            font={FONTS.Philosopher}
            color="white"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.8}
            textAlign="center">
            {answer.label}
          </Text>

          {/* Debug indicator for rhythm-based gates */}
          {rhythmData && (
            <mesh position={[0.6, 0.6, 0.11]}>
              <sphereGeometry args={[0.05]} />
              <meshBasicMaterial color="#ffd700" />
            </mesh>
          )}
        </>
      )}
    </RigidBody>
  )
})

RhythmAnswerGate.displayName = 'RhythmAnswerGate'

const RhythmAnswerGates: FC = () => {
  const gatesRefs = useRef<(RapierRigidBody | null)[]>(new Array(9).fill(null))
  const isRespawning = useRef(false)
  const currentRhythmData = useRef<RhythmAnswerGateData | null>(null)

  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const questions = useGameStore((s) => s.questions)
  const goToNextQuestion = useGameStore((s) => s.goToNextQuestion)
  const goSlowMo = useGameStore((s) => s.goSlowMo)
  const isSlowMo = useGameStore((s) => s.isSlowMo)

  // Initialize rhythm system
  const { updateRhythmSystem, getAnswerGatesToSpawn, getNextAnswerGate, isRhythmActive } = useRhythmSystem({
    questions,
    enabled: true,
  })

  const gameTime = useRef(0)

  const { timeMultiplier } = useTimeSubscription((timeMultiplier) => {
    gatesRefs.current.forEach((gate) => {
      if (!gate) return
      const newSpeed = timeMultiplier * GATES_SPEED
      gate.setLinvel({ x: 0, y: 0, z: newSpeed }, true)
    })
  })

  // Pre-load next answer gate data
  useEffect(() => {
    if (isRhythmActive()) {
      const nextGate = getNextAnswerGate()
      if (nextGate) {
        console.warn('🎵 NEXT RHYTHM ANSWER GATE PREPARED:', {
          questionId: nextGate.question.id,
          spawnTime: nextGate.spawnTime,
          runUpDuration: nextGate.runUpDuration,
        })
      }
    }
  }, [isRhythmActive, getNextAnswerGate])

  useFrame(({}, delta) => {
    if (!isPlaying) return

    // Update rhythm system
    gameTime.current += delta * timeMultiplier.current
    updateRhythmSystem(gameTime.current)

    // Check for rhythm-based answer gate spawns
    if (isRhythmActive()) {
      const gatesToSpawn = getAnswerGatesToSpawn()

      gatesToSpawn.forEach((rhythmGate) => {
        if (!isRespawning.current) {
          console.warn('🎵 SPAWNING RHYTHM ANSWER GATES:', {
            questionId: rhythmGate.question.id,
            spawnTime: rhythmGate.spawnTime,
          })

          currentRhythmData.current = rhythmGate
          spawnRhythmAnswerGates()
        }
      })
    }

    // Existing lifecycle logic
    if (isRespawning.current) return

    const firstGate = gatesRefs.current[0]
    if (!firstGate) return

    const firstGateTranslationZ = firstGate.translation().z
    const gatesNeedKilling = firstGateTranslationZ > KILL_OBSTACLE_Z

    if (gatesNeedKilling) {
      console.warn('🎵 RHYTHM GATES LIFECYCLE COMPLETE', { firstGateTranslationZ })
      isRespawning.current = true

      gatesRefs.current.forEach((gate) => {
        if (!gate) return
        gate.setLinvel({ x: 0, y: 0, z: 0 }, false)
        gate.setTranslation({ x: 0, y: 0, z: -1000 }, false)
      })

      goToNextQuestion()
      currentRhythmData.current = null

      setTimeout(() => {
        isRespawning.current = false
      }, 1000)
      return
    }

    // Slow-mo timing logic (adjust for rhythm-based timing)
    const shouldSlowDown = Math.round(firstGateTranslationZ) === -3 && !isSlowMo

    if (shouldSlowDown) {
      console.warn('🎵 RHYTHM SLOW-MO TRIGGERED', { firstGateTranslationZ })
      goSlowMo()
    }
  })

  const spawnRhythmAnswerGates = () => {
    gatesRefs.current.forEach((gate, index) => {
      if (!gate) return

      const position = gatePositions[index]
      gate.setLinvel({ x: 0, y: 0, z: GATES_SPEED * timeMultiplier.current }, false)
      gate.setTranslation(
        {
          x: position[0],
          y: position[1],
          z: SPAWN_OBSTACLE_Z - 2,
        },
        false,
      )
    })
  }

  return (
    <>
      {gatePositions.map((position, index) => (
        <RhythmAnswerGate
          ref={(ref) => {
            gatesRefs.current[index] = ref
          }}
          key={`rhythm_gate_${index}`}
          position={position}
          index={index}
          rhythmData={currentRhythmData.current || undefined}
        />
      ))}
    </>
  )
}

// Constants (moved from original file)
const GATES_SPEED = 5.5

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

const FONTS = {
  Philosopher: 'https://fonts.gstatic.com/s/philosopher/v9/vEFV2_5QCwIS4_Dhez5jcWBuT0s.woff',
}

export default RhythmAnswerGates
