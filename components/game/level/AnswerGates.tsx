'use client'
import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, type IntersectionEnterPayload, RapierRigidBody, RigidBody } from '@react-three/rapier'
import gsap from 'gsap'
import React, { type FC, useRef } from 'react'

import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import type { Answer } from '@/model/content'
import { type AnswerGateUserData, type RigidBodyUserData } from '@/model/game'
import { FONTS } from '@/resources/fonts'
import {
  GameStage,
  GRID_SQUARE_SIZE_M,
  KILL_OBSTACLE_Z,
  LANES_X,
  LANES_Y,
  SPAWN_OBSTACLE_Z,
  useGameStore,
} from '@/stores/GameProvider'
import { Phase, useLevelStore } from '@/stores/LevelProvider'

type AnswerGateProps = {
  position: [number, number, number]
  answer: Answer | null
}

const RhythmAnswerGate = React.forwardRef<RapierRigidBody, AnswerGateProps>(({ position, answer }, ref) => {
  // Get answer from rhythm data - this is always provided by the rhythm system
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
      console.warn('🎵 ANSWER GATE HIT:', {
        answerId: answer?.id,
        isCorrect: answer?.isCorrect,
      })
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
        <group>
          <mesh>
            <boxGeometry args={[GRID_SQUARE_SIZE_M, GRID_SQUARE_SIZE_M, 0.1]} />
            <meshStandardMaterial
              ref={material}
              color={answer.isCorrect ? '#4ade80' : '#f87171'}
              transparent={true}
              opacity={0.6} // Rhythm gates are slightly more opaque
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
        </group>
      )}
    </RigidBody>
  )
})

RhythmAnswerGate.displayName = 'RhythmAnswerGate'

const RhythmAnswerGates: FC = () => {
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const goSlowMo = useLevelStore((s) => s.goSlowMo)
  const isSlowMo = useLevelStore((s) => s.isSlowMo)
  const isQuestionPhase = useLevelStore((s) => s.phase === Phase.QUESTION)
  const answerSpeed = useLevelStore((s) => s.answerSpeed)
  const questionIndex = useLevelStore((s) => s.questionIndex)
  const answersMapping = useLevelStore((s) => s.answersMapping)
  const onQuestionPhaseCompleted = useLevelStore((s) => s.onQuestionPhaseCompleted)

  const gatesRefs = useRef<(RapierRigidBody | null)[]>(new Array(9).fill(null))
  const isLive = useRef(false) // True when gates are active and moving
  const lastSpawnedQuestionIndex = useRef(-1) // Track last spawned question index to prevent duplicate spawns

  const { timeMultiplier } = useTimeSubscription((timeMultiplier) => {
    gatesRefs.current.forEach((gate) => {
      if (!gate) return
      const newSpeed = timeMultiplier * answerSpeed
      gate.setLinvel({ x: 0, y: 0, z: newSpeed }, true)
    })
  })

  function spawnAnswerGates() {
    gatesRefs.current.forEach((gate, index) => {
      if (!gate) return
      const position = gatePositions[index]
      const speed = timeMultiplier.current * answerSpeed
      gate.setLinvel({ x: 0, y: 0, z: speed }, true)
      gate.setTranslation(
        {
          x: position[0],
          y: position[1],
          z: SPAWN_OBSTACLE_Z,
        },
        true,
      )
    })
  }

  function killAnswerGates() {
    onQuestionPhaseCompleted() // Move to next phase as soon as the gates are killed
    gatesRefs.current.forEach((gate) => {
      if (!gate) return
      gate.setLinvel({ x: 0, y: 0, z: 0 }, false)
      gate.setTranslation({ x: 0, y: 0, z: 5 }, false)
    })
    isLive.current = false // Gates are no longer live, ready for next spawn
  }

  useFrame(() => {
    if (!isPlaying) return

    // Check for rhythm-based answer gate spawns - only when gates are not currently live
    if (!isLive.current && isQuestionPhase && questionIndex !== lastSpawnedQuestionIndex.current) {
      isLive.current = true // Gates are now live and moving
      lastSpawnedQuestionIndex.current = questionIndex
      spawnAnswerGates()
    }

    // Lifecycle management - only when gates are live
    if (isLive.current) {
      const firstGate = gatesRefs.current[0]
      if (!firstGate) return

      const firstGateTranslationZ = firstGate.translation().z
      const gatesNeedKilling = firstGateTranslationZ > KILL_OBSTACLE_Z
      if (gatesNeedKilling) return killAnswerGates()

      // Slow-mo timing logic (adjust for rhythm-based timing)
      const shouldSlowDown = Math.round(firstGateTranslationZ) === -3 && !isSlowMo
      if (shouldSlowDown) goSlowMo()
    }
  })

  return (
    <>
      {gatePositions.map((position, index) => (
        <RhythmAnswerGate
          ref={(ref) => {
            gatesRefs.current[index] = ref
          }}
          key={index}
          position={position}
          answer={answersMapping[index]}
        />
      ))}
    </>
  )
}

// Gate position generation
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

export default RhythmAnswerGates
