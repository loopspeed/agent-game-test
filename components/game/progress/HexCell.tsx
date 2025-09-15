'use client'
import { Html } from '@react-three/drei'
import { type FC } from 'react'

import { axialToWorld, heightAt } from './PlayerIndicator'
import { GROUND_HEIGHT, HEX_SIZE } from './Terrain'

export type HexCellProps = {
  q: number
  r: number
  active: boolean
  label: string
}

const HEXAGON_CELL_RADIUS = HEX_SIZE * 0.7
const LABEL_HEIGHT_OFFSET = 5.0
const CELL_FILL_COLOR = '#00fff2'
const CELL_EMISSIVE_COLOR = '#00fff2'
const CELL_EMISSIVE_INTENSITY = 0.4
const CELL_OPACITY = 0.5
const LABEL_TEXT_COLOR = '#ffffff'
const LABEL_BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.9)'
const LABEL_BORDER_COLOR = 'rgba(255, 255, 0, 0.8)'

const HexCell: FC<HexCellProps> = ({ q, r, active, label }) => {
  const [hexagonWorldX, hexagonWorldZ] = axialToWorld(q, r)
  const hexagonWorldY = GROUND_HEIGHT + heightAt() + 0.1

  return (
    <group position={[hexagonWorldX, hexagonWorldY, hexagonWorldZ]}>
      {/* Fill only when player is actively on this cell */}
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <circleGeometry args={[HEXAGON_CELL_RADIUS, 6]} />
          <meshStandardMaterial
            color={CELL_FILL_COLOR}
            emissive={CELL_EMISSIVE_COLOR}
            emissiveIntensity={CELL_EMISSIVE_INTENSITY}
            transparent
            opacity={CELL_OPACITY}
          />
        </mesh>
      )}

      {/* Label - always visible when present */}
      {label && (
        <Html position={[0, LABEL_HEIGHT_OFFSET, 0]} center>
          <div
            style={{
              color: LABEL_TEXT_COLOR,
              background: LABEL_BACKGROUND_COLOR,
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              textShadow: '0 0 8px rgba(0, 255, 255, 0.8)',
              border: `2px solid ${LABEL_BORDER_COLOR}`,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  )
}

export default HexCell
