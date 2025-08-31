'use client'

import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import React, { type FC, useEffect, useRef } from 'react'

import type { Answer } from '@/data/questions'
import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { type AnswerGateUserData } from '@/model/game'
import {
  GameStage,
  GRID_SQUARE_SIZE_M,
  KILL_OBSTACLE_Z,
  LANES_X,
  LANES_Y,
  SPAWN_OBSTACLE_Z,
  useGameStore,
} from '@/stores/GameProvider'
import { useQuestionStore } from '@/stores/questionStore'

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
      {/* Full size of the grid square */}
      <CuboidCollider args={[1, 1, 0.1]} sensor={true} />

      {/* Only render visual elements if there's an answer to display (others are "nets" to catch misses) */}
      {hasAnswer && (
        <>
          {/* Flat box container */}
          <mesh>
            <boxGeometry args={[GRID_SQUARE_SIZE_M, GRID_SQUARE_SIZE_M, 0.1]} />
            <meshStandardMaterial color={answer.isCorrect ? '#4ade80' : '#f87171'} transparent opacity={0.4} />
          </mesh>
          {/* Answer text */}
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

const BASE_SPEED = 5.0

const AnswerGates: FC = () => {
  const currentQuestion = useQuestionStore((s) => s.currentQuestion)
  const goToNextQuestion = useQuestionStore((s) => s.goToNextQuestion)

  const gatesRefs = useRef<(RapierRigidBody | null)[]>(new Array(9).fill(null))
  const isRespawning = useRef(false)

  const stage = useGameStore((s) => s.stage)
  const isPlaying = stage === GameStage.PLAYING
  const isSlowMo = useGameStore((s) => s.isSlowMo)
  const goSlowMo = useGameStore((s) => s.goSlowMo)

  const { timeMultiplier } = useTimeSubscription((timeMultiplier) => {
    gatesRefs.current.forEach((gate) => {
      if (!gate) return // Check for null ref
      const newSpeed = timeMultiplier * BASE_SPEED
      gate.setLinvel({ x: 0, y: 0, z: newSpeed }, true)
    })
  })

  // Set velocity once when gates are created or speed changes
  useEffect(() => {
    const currentGates = gatesRefs.current // Capture refs at effect creation time

    const resetGatePositions = () => {
      currentGates.forEach((gate, index) => {
        if (!gate) return // Check for null ref
        try {
          const position = gatePositions[index]
          gate.setTranslation({ x: position[0], y: position[1], z: SPAWN_OBSTACLE_Z }, true)
          gate.setLinvel({ x: 0, y: 0, z: BASE_SPEED * timeMultiplier.current }, true)
        } catch (error) {
          console.warn(`Failed to set velocity for gate ${index}:`, error)
        }
      })
    }

    if (isPlaying) {
      resetGatePositions()
    }
  }, [isPlaying, currentQuestion, timeMultiplier])

  // Check lifecycle only
  useFrame(() => {
    if (!isPlaying) return
    // Check if gates have passed the kill zone and move to next question
    const firstGate = gatesRefs.current[0]
    if (!firstGate) return

    const firstGateTranslationZ = firstGate.translation().z

    const gatesNeedKilling = firstGateTranslationZ > KILL_OBSTACLE_Z

    if (gatesNeedKilling && !isRespawning.current) {
      console.warn('Going to next question', { firstGateTranslationZ })
      isRespawning.current = true
      goToNextQuestion()
      // Reset the flag after a short delay to allow for next cycle
      setTimeout(() => {
        isRespawning.current = false
      }, 500)
      return
    }

    const shouldSlowDown = Math.round(firstGateTranslationZ) === -4 && !isSlowMo

    if (shouldSlowDown) {
      console.log('Slowing down obstacles for answer selection', { firstGateTranslationZ })
      goSlowMo()
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

    console.warn({ mapping })

    return mapping
  }

  const answerMapping = getAnswerMapping()

  return (
    <>
      {gates.map((_, gateIndex) => (
        <AnswerGate
          ref={(ref) => {
            gatesRefs.current[gateIndex] = ref
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

// Examples
const FONTS = {
  Roboto: 'https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff',
  'Noto Sans': 'https://fonts.gstatic.com/s/notosans/v7/o-0IIpQlx3QUlC5A4PNr5TRG.woff',
  //too thin: 'Alex Brush': 'https://fonts.gstatic.com/s/alexbrush/v8/SZc83FzrJKuqFbwMKk6EhUXz6w.woff',
  Comfortaa: 'https://fonts.gstatic.com/s/comfortaa/v12/1Ptsg8LJRfWJmhDAuUs4TYFs.woff',
  Cookie: 'https://fonts.gstatic.com/s/cookie/v8/syky-y18lb0tSbf9kgqU.woff',
  //throws: 'Cutive Mono': 'https://fonts.gstatic.com/s/cutivemono/v6/m8JWjfRfY7WVjVi2E-K9H6RCTmg.woff',
  //throws: 'Gabriela': 'https://fonts.gstatic.com/s/gabriela/v6/qkBWXvsO6sreR8E-b8m5xL0.woff',
  Philosopher: 'https://fonts.gstatic.com/s/philosopher/v9/vEFV2_5QCwIS4_Dhez5jcWBuT0s.woff',
  Quicksand: 'https://fonts.gstatic.com/s/quicksand/v7/6xKtdSZaM9iE8KbpRA_hK1QL.woff',
  Trirong: 'https://fonts.gstatic.com/s/trirong/v3/7r3GqXNgp8wxdOdOn4so3g.woff',
  Trocchi: 'https://fonts.gstatic.com/s/trocchi/v6/qWcqB6WkuIDxDZLcPrxeuw.woff',
  'Advent Pro': 'https://fonts.gstatic.com/s/adventpro/v7/V8mAoQfxVT4Dvddr_yOwhTqtLg.woff',
  'Henny Penny': 'https://fonts.gstatic.com/s/hennypenny/v5/wXKvE3UZookzsxz_kjGSfPQtvXQ.woff',
  Orbitron: 'https://fonts.gstatic.com/s/orbitron/v9/yMJRMIlzdpvBhQQL_Qq7dys.woff',
  Sacramento: 'https://fonts.gstatic.com/s/sacramento/v5/buEzpo6gcdjy0EiZMBUG4C0f-w.woff',
  'Snowburst One': 'https://fonts.gstatic.com/s/snowburstone/v5/MQpS-WezKdujBsXY3B7I-UT7SZieOA.woff',
  Syncopate: 'https://fonts.gstatic.com/s/syncopate/v9/pe0sMIuPIYBCpEV5eFdCBfe5.woff',
  Wallpoet: 'https://fonts.gstatic.com/s/wallpoet/v9/f0X10em2_8RnXVVdUObp58I.woff',
  'Sirin Stencil': 'https://fonts.gstatic.com/s/sirinstencil/v6/mem4YaWwznmLx-lzGfN7MdRyRc9MAQ.woff',
  'Roboto Slab':
    'https://rawcdn.githack.com/google/fonts/3b179b729ac3306ab2a249d848d94ff08b90a0af/apache/robotoslab/static/RobotoSlab-Black.ttf',
}
