'use client'
import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { RapierRigidBody, RigidBody } from '@react-three/rapier'
import React, { type FC, useRef } from 'react'

import { LevelPhase } from '@/model/game'
import { FONTS } from '@/resources/fonts'
import { GRID_SQUARE_SIZE_M, KILL_OBSTACLE_Z, LANES_Y, SPAWN_OBSTACLE_Z } from '@/stores/LevelProvider'
import { useLevelStore } from '@/stores/LevelProvider'

const LEVEL_COMPLETE_SPEED = 15

const Outro: FC = () => {
  const isOutroPhase = useLevelStore((s) => s.phase === LevelPhase.OUTRO)
  const onOutroPhaseCompleted = useLevelStore((s) => s.onOutroCompleted)

  const body = useRef<RapierRigidBody>(null)
  const isLive = useRef(false)

  function spawnOutroBanner() {
    isLive.current = true
    const speed = LEVEL_COMPLETE_SPEED
    body.current!.setTranslation(
      {
        x: 0,
        y: LANES_Y[1],
        z: SPAWN_OBSTACLE_Z,
      },
      true,
    )
    body.current!.setLinvel({ x: 0, y: 0, z: speed }, true)
  }

  function endOutro() {
    onOutroPhaseCompleted()
    isLive.current = false
    body.current!.setLinvel({ x: 0, y: 0, z: 0 }, true)
  }

  useFrame(() => {
    if (!body.current) return
    if (!isOutroPhase) return

    if (!isLive.current) {
      spawnOutroBanner()
      return
    }

    const translationZ = body.current.translation().z
    const hasEnded = Math.round(translationZ) === KILL_OBSTACLE_Z
    if (hasEnded) endOutro()
  })

  return (
    <RigidBody ref={body} colliders={false} position={[0, LANES_Y[1], 5]}>
      <Text
        position={[0, 0, 0]}
        fontSize={1.4}
        font={FONTS.Roboto}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={GRID_SQUARE_SIZE_M * 3}
        textAlign="center">
        LEVEL COMPLETE!
      </Text>
    </RigidBody>
  )
}

export default Outro
