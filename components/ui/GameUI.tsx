'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { folder, Leva, useControls } from 'leva'
import { type FC, useEffect, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'

import GameOverUI from '@/components/ui/GameOver'
import PlayingUI from '@/components/ui/PlayingUI'
import useGameControls from '@/hooks/useGameControls'
import { LEVA_CONTROLS_THEME } from '@/resources/leva'
import { GameStage, useGameStore } from '@/stores/GameProvider'
import { OBSTACLE_PRESETS, useConfigStore } from '@/stores/useConfigStore'

const GameUI: FC = () => {
  const stage = useGameStore((s) => s.stage)
  const container = useRef<HTMLDivElement>(null)

  return (
    <SwitchTransition>
      <Transition key={stage} timeout={{ enter: 300, exit: 400 }} nodeRef={container} appear>
        {(status) => (
          <div
            className="pointer-events-none fixed top-0 z-100 flex !h-svh w-full items-center justify-center"
            ref={container}>
            {stage === GameStage.READY && <ReadyUI transitionStatus={status} />}
            {stage === GameStage.PLAYING && <PlayingUI transitionStatus={status} />}
            {stage === GameStage.COMPLETED && <GameOverUI transitionStatus={status} />}
          </div>
        )}
      </Transition>
    </SwitchTransition>
  )
}

export default GameUI

const ReadyUI: FC<{ transitionStatus: TransitionStatus }> = ({ transitionStatus }) => {
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const { handleStart } = useGameControls()
  const container = useRef<HTMLDivElement>(null)

  // Configuration...
  const obstacleSpeed = useConfigStore((s) => s.obstacleSpeed)
  const setObstacleSpeed = useConfigStore((s) => s.setObstacleSpeed)

  const obstacleSpawnInterval = useConfigStore((s) => s.obstacleSpawnInterval)
  const setObstacleSpawnInterval = useConfigStore((s) => s.setObstacleSpawnInterval)

  const slowMoDuration = useConfigStore((s) => s.slowMoDuration)
  const setSlowMoDuration = useConfigStore((s) => s.setSlowMoDuration)

  const phaseDurations = useConfigStore((s) => s.phaseDurations)
  const setPhaseDurations = useConfigStore((s) => s.setPhaseDurations)

  const [{ preset }, setControls] = useControls(() => {
    return {
      slowMoDuration: {
        label: 'Question Answer Time (seconds)',
        min: 1,
        step: 0.5,
        max: 20,
        value: slowMoDuration,
        onChange: (value) => setSlowMoDuration(value),
      },

      includeObstacles: {
        label: 'Include obstacles',
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
        label: 'Phase Duration',
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
        label: 'Preset',
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
        handleStart()
      }
    }

    if (!isPlaying) window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPlaying, handleStart])

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
        <Leva theme={LEVA_CONTROLS_THEME} titleBar={{ drag: false, filter: false }} fill={true} collapsed={false} />
      </div>

      <span className="text-3xl font-black text-white">TAP ENTER TO BEGIN</span>
    </div>
  )
}
