'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Leva, useControls } from 'leva'
import { type FC, useEffect, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'

import { LEVA_CONTROLS_THEME } from '@/resources/leva'
import { useLevelStore } from '@/stores/LevelProvider'
import { SoundFX, useSoundStore } from '@/stores/SoundProvider'
import { OBSTACLE_PRESETS, useLevelConfigStore } from '@/stores/useLevelConfigStore'

type Props = {
  transitionStatus: TransitionStatus
}

const ConfigUI: FC<Props> = ({ transitionStatus }) => {
  const onConfigCompleted = useLevelStore((s) => s.onConfigCompleted)
  const playSoundFX = useSoundStore((s) => s.playSoundFX)
  const container = useRef<HTMLDivElement>(null)

  // Configuration...
  const showOnboarding = useLevelConfigStore((s) => s.showOnboarding)
  const setShowOnboarding = useLevelConfigStore((s) => s.setShowOnboarding)

  const obstacleSpeed = useLevelConfigStore((s) => s.obstacleSpeed)
  const setObstacleSpeed = useLevelConfigStore((s) => s.setObstacleSpeed)

  const obstacleSpawnInterval = useLevelConfigStore((s) => s.obstacleSpawnInterval)
  const setObstacleSpawnInterval = useLevelConfigStore((s) => s.setObstacleSpawnInterval)

  const slowMoDuration = useLevelConfigStore((s) => s.answerTimeDuration)
  const setSlowMoDuration = useLevelConfigStore((s) => s.setAnswerTimeDuration)

  const phaseDurations = useLevelConfigStore((s) => s.phaseDurations)
  const setPhaseDurations = useLevelConfigStore((s) => s.setPhaseDurations)

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

      slowMoDuration: {
        label: 'Question Answer Time (seconds)',
        min: 1,
        step: 0.5,
        max: 20,
        value: slowMoDuration,
        onChange: (value) => setSlowMoDuration(value),
      },

      includeObstacles: {
        label: 'Include Obstacles',
        value: true,
        onChange: (value) => {
          if (!value) {
            setPhaseDurations({ ...phaseDurations, OBSTACLES: 0 })
          } else {
            setPhaseDurations({ ...phaseDurations, OBSTACLES: 6 })
          }
        },
      },

      phaseDuration: {
        label: 'Obstacles Duration',
        min: 1,
        step: 1,
        max: 30,
        value: phaseDurations.OBSTACLES,
        onChange: (value) => {
          setPhaseDurations({ ...phaseDurations, OBSTACLES: value })
        },
        render: (get) => !!get('includeObstacles'),
      },

      preset: {
        label: 'Difficulty Preset',
        value: 'Normal',
        options: Object.keys(OBSTACLE_PRESETS),
        transient: false,
        onChange: (value) => {
          const preset = OBSTACLE_PRESETS[value]
          setObstacleSpawnInterval(preset.obstacleSpawnInterval)
          setObstacleSpeed(preset.obstacleSpeed)
        },
        render: (get) => !!get('includeObstacles'),
      },

      spawnInterval: {
        label: 'Spawn Interval (seconds)',
        min: 0.5,
        step: 0.25,
        max: 3,
        value: obstacleSpawnInterval,
        onChange: (value) => setObstacleSpawnInterval(value),
        render: (get) => !!get('includeObstacles'),
      },
      speed: {
        label: 'Speed',
        min: 5,
        step: 0.5,
        max: 30,
        value: obstacleSpeed,
        onChange: (value) => setObstacleSpeed(value),
        render: (get) => !!get('includeObstacles'),
      },
    }
  })

  useEffect(() => {
    // Update controls when preset changes
    setControls({
      spawnInterval: OBSTACLE_PRESETS[preset].obstacleSpawnInterval,
      speed: OBSTACLE_PRESETS[preset].obstacleSpeed,
    })
  }, [preset, setControls])

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
    <div ref={container} className="absolute inset-0 flex flex-col items-center justify-center gap-12">
      <div className="pointer-events-auto h-80 w-150">
        <Leva
          theme={LEVA_CONTROLS_THEME}
          hideCopyButton={true}
          titleBar={{ drag: false, filter: false }}
          fill={true}
          collapsed={false}
        />
      </div>

      <span className="text-3xl font-black text-white">TAP ENTER TO BEGIN</span>
    </div>
  )
}

export default ConfigUI
