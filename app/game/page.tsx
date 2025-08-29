'use client';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import { Physics } from '@react-three/rapier';
import Scene from '../../components/Scene';
import { useInputStore } from '../../stores/inputStore';

export default function GamePage() {
  // Attach keyboard listeners for 4-way movement
  const { setKey } = useInputStore();
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setKey('up', true);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setKey('down', true);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setKey('left', true);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setKey('right', true);
          break;
        default:
          break;
      }
    };
    const up = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setKey('up', false);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setKey('down', false);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setKey('left', false);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setKey('right', false);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [setKey]);

  return (
    <main className="relative w-full h-screen overflow-hidden">
      <Canvas className="absolute inset-0">
        <Suspense fallback={null}>
          {/* Physics world with zero gravity (kinematic bodies only) */}
          <Physics gravity={[0, 0, 0]}>
            <Scene />
          </Physics>
        </Suspense>
      </Canvas>
      {/* Heads-up display overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
        {/* Future HUD components (score, health, streak, timer) will be inserted here */}
      </div>
    </main>
  );
}