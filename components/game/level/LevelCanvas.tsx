'use client'
import { CameraShake, type CameraShakeProps, type ShakeController, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
// import { extend, type ThreeToJSXElements } from '@react-three/fiber'
import { type FC, useRef } from 'react'
import React from 'react'
import { color, Fn } from 'three/src/nodes/TSL.js'

// import { type WebGPURendererParameters } from 'three/src/renderers/webgpu/WebGPURenderer.js'
// import * as THREE from 'three/webgpu'
import LevelScene from '@/components/game/level/LevelScene'
import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { CAMERA_FAR } from '@/stores/GameProvider'

// WEBGPU RENDERER IS NOT WORKING WITH RAPIER AT THE MOMENT

// declare module '@react-three/fiber' {
//   // eslint-disable-next-line @typescript-eslint/no-empty-object-type
//   interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
// }

// extend(THREE as any)

const LevelCanvas: FC = () => {
  return (
    <Canvas
      className="!fixed inset-0 !h-lvh"
      performance={{ min: 0.2, debounce: 300 }}
      scene={{ backgroundNode: backgroundNode }}
      gl={{
        antialias: false,
        // powerPreference: 'low-power',
        alpha: false,
      }}
      // gl={async (props) => {
      //   const renderer = new THREE.WebGPURenderer({
      //     ...(props as WebGPURendererParameters),
      //     alpha: false,
      //   })
      //   await renderer.init()
      //   return renderer
      // }}
      camera={{ position: [0, 0.2, 4], fov: 75, far: CAMERA_FAR }}>
      <CameraMovement />
      <Stats />
      <LevelScene />
    </Canvas>
  )
}

export default LevelCanvas

const backgroundNode = Fn(() => {
  return color('#000000')
})()

const SHAKE_CONFIG: CameraShakeProps = {
  maxYaw: 0.08,
  maxPitch: 0.08,
  maxRoll: 0.08,
  yawFrequency: 0.1,
  pitchFrequency: 0.1,
  rollFrequency: 0.1,
  intensity: 1,
  decay: false,
  decayRate: 0.65,
}

const CameraMovement: FC = () => {
  const ref = useRef<ShakeController>(null)

  useTimeSubscription((timeMultiplier) => {
    if (ref.current) {
      ref.current.setIntensity(timeMultiplier)
    }
  })

  return <CameraShake ref={ref} {...SHAKE_CONFIG} />
}
