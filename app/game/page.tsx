'use client'

import { Leva, useControls } from 'leva'
import { LevaCustomTheme } from 'leva/dist/declarations/src/styles'
import { type FC, useEffect } from 'react'
import React from 'react'

import DebugDisplay from '@/components/debug/DebugDisplay'
import LevelCanvas from '@/components/game/level/LevelCanvas'
import GameUI from '@/components/ui/GameUI'
import { useTimeSubscription } from '@/hooks/useTimeSubscription'
import { GameProvider, useGameStore } from '@/stores/GameProvider'
import { useLevelStore } from '@/stores/LevelProvider'
import { useInputStore } from '@/stores/useInputStore'

const GameContent: FC = () => {
  const resetGame = useGameStore((s) => s.resetStore)
  const resetLevel = useLevelStore((s) => s.reset)

  useEffect(() => {
    return () => {
      resetGame()
      resetLevel()
    }
  }, [resetGame, resetLevel])

  useKeypadInput()

  return (
    <main className="h-lvh w-full overflow-hidden">
      <LevelCanvas />
      <GameUI />
      <DebugDisplay />
      <DeveloperControls />
      <Leva theme={LEVA_CONTROLS_THEME} />
    </main>
  )
}

export default function GamePage() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  )
}

// Custom theme to make controls much bigger and more visible
const LEVA_CONTROLS_THEME: LevaCustomTheme = {
  fontSizes: {
    root: '12px', // Increased from default 11px to 14px for better readability
  },
  sizes: {
    rootWidth: '480px', // Increased from default 280px for more width
    controlWidth: '220px', // Increased from default 160px for wider controls
    rowHeight: '32px', // Increased from default 24px for taller rows
    folderTitleHeight: '24px', // Increased from default 20px for taller folder titles
  },
  space: {
    sm: '8px', // Increased from default 6px
    md: '14px', // Increased from default 10px
    rowGap: '8px', // Increased from default 7px for more spacing between rows
    colGap: '8px', // Increased from default 7px for more spacing between columns
  },
}

const DeveloperControls: FC = () => {
  const setTimeMultiplier = useLevelStore((s) => s.setTimeMultiplier)
  const timeMultiplier = useLevelStore((s) => s.timeMultiplier)
  const phaseDurations = useLevelStore((s) => s.phaseDurations)
  const setPhaseDurations = useLevelStore((s) => s.setPhaseDurations)
  const slowMoDuration = useLevelStore((s) => s.slowMoDuration)
  const setSlowMoDuration = useLevelStore((s) => s.setSlowMoDuration)
  const obstacleSpawnInterval = useLevelStore((s) => s.obstacleSpawnInterval)
  const setObstacleSpawnInterval = useLevelStore((s) => s.setObstacleSpawnInterval)
  const obstacleSpeed = useLevelStore((s) => s.obstacleSpeed)
  const setObstacleSpeed = useLevelStore((s) => s.setObstacleSpeed)
  const answerSpeed = useLevelStore((s) => s.answerSpeed)
  const setAnswerSpeed = useLevelStore((s) => s.setAnswerSpeed)

  const [, setControls] = useControls('Game', () => {
    return {
      time: {
        label: 'Time Multiplier',
        min: 0.1,
        step: 0.1,
        max: 1,
        value: timeMultiplier,
        onChange: (value) => setTimeMultiplier(value),
      },
      slowMoDuration: {
        label: 'Slow-Mo Duration',
        min: 0.5,
        step: 0.1,
        max: 5,
        value: slowMoDuration,
        onChange: (value) => setSlowMoDuration(value),
      },
      obstacleSpawnInterval: {
        label: 'Obstacle Spawn Interval',
        min: 0.5,
        step: 0.1,
        max: 3,
        value: obstacleSpawnInterval,
        onChange: (value) => setObstacleSpawnInterval(value),
      },
      obstacleSpeed: {
        label: 'Obstacle Speed',
        min: 4,
        step: 0.5,
        max: 30,
        value: obstacleSpeed,
        onChange: (value) => setObstacleSpeed(value),
      },
      answerSpeed: {
        label: 'Answer Speed',
        min: 4,
        step: 0.5,
        max: 20,
        value: answerSpeed,
        onChange: (value) => setAnswerSpeed(value),
      },
      introDuration: {
        label: 'Intro Phase Duration',
        min: 0.5,
        step: 0.1,
        max: 5,
        value: phaseDurations.INTRO,
        onChange: (value) => setPhaseDurations({ ...phaseDurations, INTRO: value }),
      },
      restDuration: {
        label: 'Rest Phase Duration',
        min: 1,
        step: 0.5,
        max: 10,
        value: phaseDurations.REST,
        onChange: (value) => setPhaseDurations({ ...phaseDurations, REST: value }),
      },
      obstaclesDuration: {
        label: 'Obstacles Phase Duration',
        min: 1,
        step: 1,
        max: 30,
        value: phaseDurations.OBSTACLES,
        onChange: (value) => setPhaseDurations({ ...phaseDurations, OBSTACLES: value }),
      },
      outroDuration: {
        label: 'Outro Phase Duration',
        min: 0.5,
        step: 0.1,
        max: 10,
        value: phaseDurations.OUTRO,
        onChange: (value) => setPhaseDurations({ ...phaseDurations, OUTRO: value }),
      },
    }
  })

  // Sync controls with the store state
  useTimeSubscription((currentTimeMultiplier) => {
    setControls({
      time: currentTimeMultiplier,
    })
  })

  return null
}

function useKeypadInput() {
  const { setKey } = useInputStore()

  // Attach keyboard listeners for 4-way movement
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W': {
          setKey('up', true)
          break
        }
        case 'ArrowDown':
        case 's':
        case 'S': {
          setKey('down', true)
          break
        }
        case 'ArrowLeft':
        case 'a':
        case 'A': {
          setKey('left', true)
          break
        }
        case 'ArrowRight':
        case 'd':
        case 'D': {
          setKey('right', true)
          break
        }
        default:
          break
      }
    }
    const up = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setKey('up', false)
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          setKey('down', false)
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setKey('left', false)
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          setKey('right', false)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [setKey])
}
