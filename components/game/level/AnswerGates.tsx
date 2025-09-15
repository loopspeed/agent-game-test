'use client'
import { Image, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, type IntersectionEnterPayload, RapierRigidBody, RigidBody } from '@react-three/rapier'
import React, { type FC, useRef } from 'react'

import activeGateIndicator from '@/assets/selected-gate-indicator.png'
import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import type { Answer } from '@/model/content'
import { type AnswerGateUserData, LevelPhase, RigidBodyType, type RigidBodyUserData } from '@/model/game'
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
import { useLevelStore } from '@/stores/LevelProvider'

type AnswerGateProps = {
  position: [number, number, number]
  answer: Answer | null
  questionId: string | null
  isActive: boolean
}

const AnswerGate = React.forwardRef<RapierRigidBody, AnswerGateProps>(
  ({ position, answer, questionId, isActive }, ref) => {
    // Get answer from rhythm data - this is always provided by the rhythm system
    const userData: AnswerGateUserData = {
      type: RigidBodyType.ANSWER_GATE,
      isCorrect: answer?.isCorrect ?? false,
      answerId: answer?.id ?? '',
      questionId: questionId ?? '',
    }

    const onIntersectionEnter = (e: IntersectionEnterPayload) => {
      if (!e.other?.rigidBody?.userData) throw new Error('Invalid userData')
      const { type } = e.other.rigidBody.userData as RigidBodyUserData

      if (type === RigidBodyType.PLAYER) {
        // // Enhanced visual feedback for rhythm-based gates
        // gsap.to(material.current, {
        //   opacity: 1.0,
        //   duration: 0.16,
        //   onComplete: () => {
        //     gsap.to(material.current, {
        //       opacity: 0.4,
        //       duration: 0.12,
        //     })
        //   },
        // })
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
          <>
            <Image url={activeGateIndicator.src} transparent={true} opacity={isActive ? 1 : 0}>
              <planeGeometry args={[GRID_SQUARE_SIZE_M, GRID_SQUARE_SIZE_M]} />
            </Image>
            <Text
              position={[0, 0, 0.1]}
              fontSize={0.25}
              font={FONTS.Roboto}
              fontStyle="normal"
              color="#fff"
              anchorX="center"
              anchorY="middle"
              maxWidth={GRID_SQUARE_SIZE_M}
              textAlign="center">
              {answer.label}
            </Text>
          </>
        )}
      </RigidBody>
    )
  },
)

AnswerGate.displayName = 'AnswerGate'

const AnswerGates: FC = () => {
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const goSlowMo = useLevelStore((s) => s.goSlowMo)
  const isSlowMo = useLevelStore((s) => s.isSlowMo)
  const isQuestionPhase = useLevelStore((s) => s.phase === LevelPhase.QUESTION)
  const answerSpeed = useLevelStore((s) => s.config.answerSpeed)
  const questionIndex = useLevelStore((s) => s.questionIndex)
  const answersMapping = useLevelStore((s) => s.answersMapping)
  const onQuestionPhaseCompleted = useLevelStore((s) => s.onQuestionPhaseCompleted)
  const question = useLevelStore((s) => s.question)
  const currentPlayerLane = useLevelStore((s) => s.currentPlayerLane) // [xIndex, yIndex]

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
      gate.setTranslation(
        {
          x: position[0],
          y: position[1],
          z: SPAWN_OBSTACLE_Z,
        },
        true,
      )
      gate.setLinvel({ x: 0, y: 0, z: speed }, true)
    })
  }

  function killAnswerGates() {
    gatesRefs.current.forEach((gate) => {
      if (!gate) return
      gate.setLinvel({ x: 0, y: 0, z: 0 }, false)
      gate.setTranslation({ x: 0, y: 0, z: 5 }, false)
    })
    isLive.current = false // Gates are no longer live, ready for next spawn
    onQuestionPhaseCompleted() // Move to next phase as soon as the gates are killed
  }

  useFrame(() => {
    if (!isPlaying) return

    // Check for rhythm-based answer gate spawns - only when gates are not currently live
    if (!isLive.current && isQuestionPhase && questionIndex !== lastSpawnedQuestionIndex.current) {
      isLive.current = true // Gates are now live and moving
      lastSpawnedQuestionIndex.current = questionIndex
      spawnAnswerGates()
    }

    if (!isLive.current) return

    // Lifecycle management - only when gates are live
    const firstGate = gatesRefs.current[0]
    if (!firstGate) return
    const firstGateTranslationZ = firstGate.translation().z

    // Check if gates need killing
    const gatesNeedKilling = firstGateTranslationZ > KILL_OBSTACLE_Z
    if (gatesNeedKilling) return killAnswerGates()

    // Slow-mo timing logic (adjust for rhythm-based timing)
    const shouldSlowDown = Math.round(firstGateTranslationZ) === -5 && !isSlowMo
    if (shouldSlowDown) goSlowMo()
  })

  return (
    <>
      {gatePositions.map((position, index) => (
        <AnswerGate
          ref={(ref) => {
            gatesRefs.current[index] = ref
          }}
          key={index}
          position={position}
          answer={answersMapping[index]}
          questionId={question.id}
          isActive={currentPlayerLane === index}
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
      positions.push([LANES_X[x], LANES_Y[y], SPAWN_OBSTACLE_Z - 10])
    }
  }
  return positions
}

const gatePositions = generateGatePositions()

export default AnswerGates
