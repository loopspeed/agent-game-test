'use client'
import { OrbitControls, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useState } from 'react'

import CameraLogger from '@/components/game/progress/CameraLog'
import HexCell from '@/components/game/progress/HexCell'
import PlayerIndicator from '@/components/game/progress/PlayerIndicator'
import Terrain from '@/components/game/progress/Terrain'
import { useKeypadInput } from '@/hooks/useKeypadInput'

type HexSection = {
  q: number
  r: number
  label: string
}

// Circular pathway of achievements
const ACHIEVEMENT_PATH: HexSection[] = [
  { q: 0, r: 0, label: 'Start' },
  { q: 1, r: 0, label: 'First Steps' },
  { q: 1, r: -1, label: 'Data Collection' },
  { q: 0, r: -1, label: 'Analysis Hub' },
  { q: -1, r: 0, label: 'Power Core' },
  { q: -1, r: 1, label: 'Security Gate' },
  { q: 0, r: 1, label: 'Upgrade Station' },
  { q: 2, r: -1, label: 'Advanced Sector' },
  { q: 1, r: -2, label: 'Deep Scan' },
  { q: -1, r: -1, label: 'Final Challenge' },
  { q: 2, r: -2, label: 'Victory Portal' },
  { q: 0, r: -2, label: 'Master Tactician' },
]

export default function ProgressPage() {
  useKeypadInput()
  const [playerHexPosition, setPlayerHexPosition] = useState<[number, number]>([0, 0])

  const handleHexCellChange = (q: number, r: number) => {
    setPlayerHexPosition([q, r])
  }

  return (
    <main className="h-lvh w-full overflow-hidden">
      <div className="bg-opacity-75 absolute top-4 left-4 z-10 rounded bg-black p-4 text-white">
        <div>
          Position: [{playerHexPosition[0]}, {playerHexPosition[1]}]
        </div>
      </div>

      <Canvas
        camera={{
          position: [0, 40, 50],
          fov: 50,
          near: 0.1,
          far: 200,
        }}>
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={15}
          maxDistance={60}
        />
        <Stats />
        <CameraLogger />

        <Physics gravity={[0, -9.81, 0]}>
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[30, 40, 20]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          <Terrain gridColor="#ffffff" />

          {ACHIEVEMENT_PATH.map((achievement) => (
            <HexCell
              key={`${achievement.q},${achievement.r}`}
              q={achievement.q}
              r={achievement.r}
              label={achievement.label}
              active={playerHexPosition[0] === achievement.q && playerHexPosition[1] === achievement.r}
            />
          ))}

          <PlayerIndicator onHexCellChange={handleHexCellChange} />
        </Physics>
      </Canvas>
    </main>
  )
}
