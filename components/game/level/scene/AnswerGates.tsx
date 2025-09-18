/* eslint-disable jsx-a11y/alt-text */
'use client'

import { Html, Image } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import React, { type FC, useMemo, useRef } from 'react'

import activeGateIndicator from '@/assets/selected-gate-indicator.png'
import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import type { Answer } from '@/model/content'
import { type AnswerGateUserData, LevelPhase, RigidBodyType } from '@/model/game'
import {
  GRID_SQUARE_SIZE_M,
  KILL_OBSTACLE_Z,
  LANES_X,
  LANES_Y,
  MAX_SLOW_MO_TRIGGER_DISTANCE,
  SLOW_MO_MULTIPLIER,
  SLOW_MO_RAMP_DURATION,
  SPAWN_OBSTACLE_Z,
  useLevelStore,
} from '@/stores/LevelProvider'

// Player Z position (where the player is positioned)
const PLAYER_Z_POSITION = 0

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

    return (
      <RigidBody
        ref={ref}
        type="dynamic"
        gravityScale={0}
        canSleep={false}
        colliders={false}
        position={position}
        userData={userData}>
        <CuboidCollider args={[GRID_SQUARE_SIZE_M / 2, GRID_SQUARE_SIZE_M / 2, 0.05]} sensor={true} />

        {/* Visual elements */}
        {!!answer && (
          <>
            {/* <mesh>
              <planeGeometry args={[GRID_SQUARE_SIZE_M, GRID_SQUARE_SIZE_M]} />
            </mesh> */}
            <Image url={activeGateIndicator.src} transparent={true} opacity={isActive ? 1 : 0}>
              <planeGeometry args={[GRID_SQUARE_SIZE_M, GRID_SQUARE_SIZE_M]} />
            </Image>
            <Html transform={true}>
              <div className="flex aspect-square size-16 items-center justify-center overflow-hidden p-0.5">
                <p className="text-center text-[6px] font-semibold text-white">{answer.label}</p>
              </div>
            </Html>
          </>
        )}
      </RigidBody>
    )
  },
)

AnswerGate.displayName = 'AnswerGate'

const AnswerGates: FC = () => {
  const isPlaying = useLevelStore((s) => s.phase !== LevelPhase.CONFIG)
  const goSlowMo = useLevelStore((s) => s.goSlowMo)
  const isSlowMo = useLevelStore((s) => s.isSlowMo)
  const isQuestionPhase = useLevelStore((s) => s.phase === LevelPhase.QUESTION)
  const answerSpeed = useLevelStore((s) => s.config.answerSpeed)
  const answerTimeDuration = useLevelStore((s) => s.config.answerTimeDuration)
  const questionIndex = useLevelStore((s) => s.questionIndex)
  const answersMapping = useLevelStore((s) => s.answersMapping)
  const onQuestionPhaseCompleted = useLevelStore((s) => s.onQuestionCompleted)
  const question = useLevelStore((s) => s.question)
  const currentPlayerLane = useLevelStore((s) => s.currentPlayerLane) // [xIndex, yIndex]

  const gatesRefs = useRef<(RapierRigidBody | null)[]>(new Array(9).fill(null))
  const isLive = useRef(false) // True when gates are active and moving
  const lastSpawnedQuestionIndex = useRef(-1) // Track last spawned question index to prevent duplicate spawns

  // Calculate the Z position where slow-mo should trigger based on answer time duration
  // This ensures the gate won't pass the player during the slow-mo period
  const slowMoTriggerZ: number = useMemo(() => {
    // Distance the gate will travel during the ramp down to slow-mo (at full speed)
    const distanceDuringRamp = answerSpeed * SLOW_MO_RAMP_DURATION

    // Calculate distance needed with normal slow-mo
    const distanceDuringNormalSlowMo = answerSpeed * SLOW_MO_MULTIPLIER * answerTimeDuration
    const totalDistanceWithNormalSlowMo = distanceDuringNormalSlowMo + distanceDuringRamp

    // Use normal slow-mo calculation
    const triggerZ = PLAYER_Z_POSITION - Math.min(totalDistanceWithNormalSlowMo, MAX_SLOW_MO_TRIGGER_DISTANCE)

    console.warn('[AnswerGates] Calculated slow-mo trigger Z:', {
      answerSpeed,
      answerTimeDuration,
      distanceDuringRamp,
      distanceDuringNormalSlowMo,
      totalDistanceWithNormalSlowMo,
      triggerZ,
    })
    return triggerZ
  }, [answerSpeed, answerTimeDuration])

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
      gate.setTranslation({ x: 0, y: 0, z: 10 }, false)
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
    const shouldSlowDown = Math.round(firstGateTranslationZ) === Math.round(slowMoTriggerZ) && !isSlowMo
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
