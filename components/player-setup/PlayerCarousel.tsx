'use client'
// import { OrbitControls, TransformControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { type FC, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import PlayerParticles from '@/components/player/particles/PlayerParticles'
import { getPlayerShapes, PlayerColour, PlayerShape } from '@/model/player'

export type Props = {
  enableDevControls?: boolean
  radius?: number
  y?: number
  onShapeSelected: (shape: PlayerShape) => void
  selectedColour: PlayerColour
  activeIndex: number
  onActiveIndexChange: (index: number) => void
}

const PlayerCarousel: FC<Props> = ({
  // enableDevControls,
  radius,
  y,
  onShapeSelected,
  selectedColour = PlayerColour.TEAL,
  activeIndex,
  onActiveIndexChange,
}) => {
  const playerObjects = useMemo(() => getPlayerShapes(), [])
  const timeMultiplier = useRef<number>(1.0)
  const [selectedShape, setSelectedShape] = useState<PlayerShape | null>(playerObjects[0])

  // left/right scrolling
  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      // if (selectedShape) return // Disable once selected  {/** TODO: deselect */}
      switch (keyEvent.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          keyEvent.preventDefault()
          const newLeftIndex = (activeIndex - 1 + playerObjects.length) % playerObjects.length
          onActiveIndexChange(newLeftIndex)
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          keyEvent.preventDefault()
          const newRightIndex = (activeIndex + 1) % playerObjects.length
          onActiveIndexChange(newRightIndex)
          break
        case 'Enter':
        case ' ':
          keyEvent.preventDefault()
          setSelectedShape(playerObjects[activeIndex])
          onShapeSelected(playerObjects[activeIndex])
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, onActiveIndexChange, onShapeSelected, playerObjects, selectedShape])

  // Rotation group
  const groupRef = useRef<THREE.Group>(null)

  // Equal spacing around circle
  const stepAngle = useMemo(() => (Math.PI * 2) / playerObjects.length, [playerObjects.length])

  // Smoothly rotate carousel to bring active index forward
  useFrame((_, delta) => {
    try {
      const targetY = -activeIndex * stepAngle
      if (!groupRef.current) return
      easing.dampE(groupRef.current.rotation, new THREE.Euler(0, targetY, 0), 0.3, delta)
    } catch (error) {
      console.error('[CharacterCarousel] useFrame error', error)
    }
  })

  // Create static velocity for carousel particles
  const staticVelocity = useMemo(() => new THREE.Vector2(0, 0), [])

  return (
    <>
      <group ref={groupRef} position={[0, y!, -0.5]}>
        {playerObjects.map((playerShape, index) => {
          const angle = index * stepAngle
          const x = Math.sin(angle) * radius!
          const z = Math.cos(angle) * radius!

          return (
            <group key={playerShape} position={[x, 0, z]} rotation={[0, -angle, 0]}>
              <PlayerParticles
                isMobile={false}
                movementVelocity={staticVelocity}
                isPlaying={false}
                timeMultiplier={timeMultiplier}
                playerShape={playerShape}
                playerColour={selectedColour}
                isInSetup={true}
              />
              {/* Highlight ring */}
              {/*
                <mesh position={[0, -3.5, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                  <ringGeometry args={[0.5, 1.2, 32]} />
                  <meshBasicMaterial transparent opacity={0.8}
                </mesh> 
              )}
              */}
            </group>
          )
        })}
      </group>
      {/* {enableDevControls && <OrbitControls makeDefault />} */}
    </>
  )
}
const ChoosePlayer: FC<Props> = ({
  enableDevControls = false,
  radius = 3.5,
  y = -5,
  onShapeSelected,
  selectedColour,
  activeIndex,
  onActiveIndexChange,
}) => {
  return (
    <div className="h-[540px] w-full rounded-2xl border border-white/10 bg-black/40">
      <Canvas
        camera={{ position: [0, 3, 9], fov: 40 }}
        dpr={[1, 1]}
        shadows={false}
        gl={{
          antialias: true,
          depth: true,
          alpha: false,
        }}>
        <color attach="background" args={['#0a0a0a']} />
        <PlayerCarousel
          enableDevControls={enableDevControls}
          radius={radius}
          y={y}
          onShapeSelected={onShapeSelected}
          selectedColour={selectedColour}
          activeIndex={activeIndex}
          onActiveIndexChange={onActiveIndexChange}
        />
      </Canvas>
      {/** TODO: deselect */}
      {/* {selectedShape && (
        <button
          className="absolute top-4 right-4 z-10 rounded bg-white/10 px-4 py-2 text-white uppercase"
          onClick={() => {
            setSelectedShape(null)
            onShapeSelected(PlayerShape.ORB)
          }}>
          deselect
        </button>
      )} */}
    </div>
  )
}

export default ChoosePlayer
