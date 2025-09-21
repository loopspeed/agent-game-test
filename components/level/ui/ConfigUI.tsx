'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Leva, useControls } from 'leva'
import { type FC, useEffect, useRef } from 'react'
import { type TransitionStatus } from 'react-transition-group'

import { LEVA_CONTROLS_THEME } from '@/resources/leva'
import { useLevelStore } from '@/stores/LevelProvider'
import { SoundFX, useSoundStore } from '@/stores/SoundProvider'
import { OBSTACLE_PRESETS, useLevelConfigStore } from '@/stores/useLevelConfigStore'

type Props = {
  transitionStatus: TransitionStatus
}

const ConfigUI: FC<Props> = ({ transitionStatus }) => {
  const course = useLevelStore((s) => s.course)
  const chapter = useLevelStore((s) => s.chapter)

  const onConfigCompleted = useLevelStore((s) => s.onConfigCompleted)
  const playSoundFX = useSoundStore((s) => s.playSoundFX)
  const container = useRef<HTMLDivElement>(null)

  // Configuration...
  const showOnboarding = useLevelConfigStore((s) => s.showOnboarding)
  const setShowOnboarding = useLevelConfigStore((s) => s.setShowOnboarding)

  const setIncludeObstacles = useLevelConfigStore((s) => s.setIncludeObstacles)

  const setObstacleSpeed = useLevelConfigStore((s) => s.setObstacleSpeed)
  const setObstacleSpawnInterval = useLevelConfigStore((s) => s.setObstacleSpawnInterval)

  const answerTimeDuration = useLevelConfigStore((s) => s.answerTimeDuration)
  const setAnswerTimeDuration = useLevelConfigStore((s) => s.setAnswerTimeDuration)

  const getLevelConfig = useLevelConfigStore((s) => s.getLevelConfig)

  const [{ preset }, setControls] = useControls(() => {
    return {
      showOnboarding: {
        label: 'Show Onboarding',
        value: showOnboarding,
        onChange: (value) => {
          setShowOnboarding(value)
        },
      },
      answerTimeDuration: {
        label: 'Answer Time (seconds)',
        min: 5,
        step: 1,
        max: 30,
        value: answerTimeDuration,
        onChange: (value) => setAnswerTimeDuration(value),
      },
      preset: {
        label: 'Obstacles',
        value: 'Normal',
        options: Object.keys(OBSTACLE_PRESETS),
        transient: false,
        onChange: (value) => {
          const includeObstacles = value !== 'Off'
          const preset = OBSTACLE_PRESETS[value]
          setObstacleSpawnInterval(preset.obstacleSpawnInterval)
          setObstacleSpeed(preset.obstacleSpeed)
          setIncludeObstacles(includeObstacles)
        },
      },
    }
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        playSoundFX(SoundFX.GET_READY)
        onConfigCompleted(getLevelConfig())
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [getLevelConfig, onConfigCompleted, playSoundFX])

  useGSAP(
    () => {
      if (transitionStatus === 'entered') {
        gsap.to(container.current, { opacity: 1, duration: 0.3 })
      }
      if (transitionStatus === 'exiting') {
        gsap.to(container.current, { opacity: 0, duration: 0.4 })
      }
    },
    { scope: container, dependencies: [transitionStatus] },
  )

  return (
    <section ref={container} className="absolute inset-0 flex flex-col items-center justify-center gap-12">
      <header>
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <h2 className="text-xl font-semibold">{chapter.title}</h2>
      </header>

      <div className="pointer-events-auto h-80 w-160">
        <Leva
          theme={LEVA_CONTROLS_THEME}
          hideCopyButton={true}
          titleBar={{ drag: false, filter: false }}
          fill={true}
          collapsed={false}
        />
      </div>

      <span className="text-3xl font-black text-white">TAP ENTER TO BEGIN</span>
    </section>
  )
}

export default ConfigUI
