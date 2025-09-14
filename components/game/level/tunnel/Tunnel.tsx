import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import React, { type FC } from 'react'

import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { CAMERA_FAR, GRID_SQUARE_SIZE_M } from '@/stores/GameProvider'

import tunnelFragment from './tunnel.frag'
import tunnelVertex from './tunnel.vert'

// Define uniforms (empty for now, but required for shaderMaterial)

type Uniforms = {
  uTime: number
}
const TUNNEL_UNIFORMS: Uniforms = {
  uTime: 0,
}

// Create custom shader material following the same pattern as PlayerParticles
const CustomTunnelShaderMaterial = shaderMaterial(TUNNEL_UNIFORMS, tunnelVertex, tunnelFragment)
const TunnelShaderMaterial = extend(CustomTunnelShaderMaterial)

const TUNNEL_RADIUS = GRID_SQUARE_SIZE_M * 4 // Large enough to wrap around the 3x3 grid
const TUNNEL_LENGTH = CAMERA_FAR * 2
const TUNNEL_SEGMENTS = 32

const Tunnel: FC = () => {
  const shaderMaterial = React.useRef<typeof TunnelShaderMaterial & Uniforms>(null)

  const { gameTime } = useTimeSubscription()

  useFrame(() => {
    if (!shaderMaterial.current) return
    shaderMaterial.current.uTime = gameTime.current
  })

  return (
    <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry
        args={[
          TUNNEL_RADIUS, // radiusTop
          TUNNEL_RADIUS, // radiusBottom
          TUNNEL_LENGTH, // height (length along Y-axis, but we rotate it to Z)
          TUNNEL_SEGMENTS, // radialSegments
          1, // heightSegments
          true, // openEnded - open at both ends
        ]}
      />
      <TunnelShaderMaterial key={CustomTunnelShaderMaterial.key} ref={shaderMaterial} side={2} />
    </mesh>
  )
}

export default Tunnel
