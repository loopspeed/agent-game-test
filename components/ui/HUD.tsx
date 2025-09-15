'use client'
import { Billboard, RoundedBox, Text } from '@react-three/drei';
import { type FC } from 'react'

import { useGameStore } from '@/stores/GameProvider';

{/* WIP */}
const HUD: FC = () => {
  const points = useGameStore(s => s.points);

  /* stage: GameStage.READY,
    streak: 0,
    maxStreak: 0,
    points: 0,
    scoreEvents: [],
    answersHit: [],
    */

  return (
    <Billboard position={[0, 2, 0]} follow rotation={[-Math.PI / 8, 0, 0]}>
      <group>
        {/* Health bar */}
        <RoundedBox args={[2, 0.4, 0.1]} radius={0.05}>
          <meshStandardMaterial color="black" transparent opacity={0.5} />
        </RoundedBox>
        {/* Individual health cells */}
        {Array.from({ length: points }, (_, i) => (
          <RoundedBox
            key={i}
            args={[0.3, 0.3, 0.05]}
            position={[ -0.8 + i * 0.4, 0, 0.06 ]}
          >
            <meshStandardMaterial color={i < points ? 'green' : 'white'} />
          </RoundedBox>
        ))}
        {/* Question text */}
        <Text
          position={[0, -0.6, 0.06]}
          fontSize={0.25}
          color="white"
          anchorX="center"
          anchorY="middle"
          maxWidth={3.5}
        >
          {points}
        </Text>
      </group>
    </Billboard>
  );
};

export default HUD