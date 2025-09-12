'use client'
import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { RapierRigidBody, RigidBody } from '@react-three/rapier'
import React, { type FC, useRef } from 'react'

import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { FONTS } from '@/resources/fonts'
import { LANES_Y, SPAWN_OBSTACLE_Z } from '@/stores/GameProvider'
import { Phase, useLevelStore } from '@/stores/LevelProvider'

const LEVEL_COMPLETE_SPEED = 12

const Outro: FC = () => {
  // const goSlowMo = useLevelStore((s) => s.goSlowMo)
  // const isSlowMo = useLevelStore((s) => s.isSlowMo)
  const isOutroPhase = useLevelStore((s) => s.phase === Phase.OUTRO)

  const body = useRef<RapierRigidBody>(null)
  const isLive = useRef(false) // True when the outro sequence has started

  // const { timeMultiplier } = useTimeSubscription((timeMultiplier) => {
  //   if (!isOutroPhase) return
  //   if (!body.current) return
  //   const speed = LEVEL_COMPLETE_SPEED * timeMultiplier
  //   body.current.setLinvel({ x: 0, y: 0, z: speed }, true)
  // })

  function spawnOutroBanner() {
    if (!body.current) return
    const speed = LEVEL_COMPLETE_SPEED
    body.current.setTranslation(
      {
        x: 0,
        y: LANES_Y[1],
        z: SPAWN_OBSTACLE_Z,
      },
      true,
    )
    body.current.setLinvel({ x: 0, y: 0, z: speed }, true)
  }

  function resetOutro() {
    if (!body.current) return
    body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    isLive.current = false
  }

  useFrame(() => {
    if (!body.current) return
    if (!isOutroPhase) return

    if (!isLive.current) {
      isLive.current = true
      spawnOutroBanner()
      return
    }

    const translationZ = body.current.translation().z
    const shouldReset = Math.round(translationZ) === 5
    if (shouldReset) resetOutro()
  })

  return (
    <RigidBody ref={body} colliders={false} position={[0, LANES_Y[1], 5]}>
      <Text
        position={[0, 0, 0]}
        fontSize={1.4}
        font={FONTS.Philosopher}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={4.0}
        textAlign="center">
        LEVEL COMPLETE!
      </Text>
    </RigidBody>
  )
}

export default Outro
