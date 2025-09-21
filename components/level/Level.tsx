'use client'
import { CameraShake, type CameraShakeProps, type ShakeController, Stats } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { type FC, useRef } from 'react'
import React from 'react'
import { type TransitionStatus } from 'react-transition-group'

import LevelScene from '@/components/level/scene/LevelScene'
import LevelUI from '@/components/level/ui/LevelUI'
import useKeypadInput from '@/hooks/useKeypadInput'
import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { type ChapterRun } from '@/model/game'
import { useCourseStore } from '@/stores/CoursesProvider'
import { CAMERA_FAR, LevelProvider } from '@/stores/LevelProvider'
import { useSoundStore } from '@/stores/SoundProvider'

// WEBGPU RENDERER IS NOT WORKING WITH RAPIER AT THE MOMENT

type Props = {
  transitionStatus: TransitionStatus
  onChapterLevelComplete: (run: ChapterRun) => void
}

const Level: FC<Props> = ({ transitionStatus, onChapterLevelComplete }) => {
  const playSoundFX = useSoundStore((s) => s.playSoundFX)
  const hasHydrated = useCourseStore((s) => s._hasHydrated)
  const course = useCourseStore((s) => s.getCurrentCourse())
  const chapter = useCourseStore((s) => s.getCurrentChapter())

  useKeypadInput()

  if (!hasHydrated) return null

  if (!course || !chapter) {
    throw new Error('No course or chapter found for level')
  }

  return (
    <LevelProvider course={course} chapter={chapter} onComplete={onChapterLevelComplete} playSoundFX={playSoundFX}>
      <Canvas
        className="!fixed inset-0 !h-lvh"
        performance={{ min: 0.2, debounce: 300 }}
        gl={{
          antialias: false,
          alpha: false,
        }}
        camera={{ position: [0, 0.2, 4], fov: 75, far: CAMERA_FAR }}>
        <CameraMovement />
        <Stats />
        <LevelScene />
      </Canvas>

      <LevelUI transitionStatus={transitionStatus} />
    </LevelProvider>
  )
}

export default Level

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
