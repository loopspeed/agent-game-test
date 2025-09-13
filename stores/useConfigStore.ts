import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { LevelPhase } from '@/model/game'

const DEFAULT_PHASE_DURATIONS: Record<LevelPhase, number> = {
  INTRO: 1, // READONLY For entry animation
  REST: 1, // READONLY Short rest before obstacles
  OBSTACLES: 6, // EDITABLE Duration for obstacles phase (0 = No obstacles)
  QUESTION: 10000, // READONLY Effectively infinite until question is answered and the gate is killed - then phase is advanced manually
  OUTRO: 5, // READONLY For showing "level complete" and other end of level stuff
  FINISHED: 10000, // READONLY For showing level complete screen - does not advance from here
} as const

export const DEFAULT_LEVEL_CONFIG: LevelConfig = {
  phaseDurations: DEFAULT_PHASE_DURATIONS,
  slowMoDuration: 4.0,
  obstacleSpawnInterval: 1.0, // Seconds between obstacles
  obstacleSpeed: 14, // Base speed for obstacles
  answerSpeed: 10, // Base speed for answer gates
}

export const OBSTACLE_PRESETS: Record<string, Pick<LevelConfig, 'obstacleSpeed' | 'obstacleSpawnInterval'>> = {
  Chilled: {
    obstacleSpeed: 10,
    obstacleSpawnInterval: 2.0,
  },
  Normal: {
    obstacleSpeed: 14,
    obstacleSpawnInterval: 1.0,
  },
  Fast: {
    obstacleSpeed: 16,
    obstacleSpawnInterval: 0.75,
  },
  Insane: {
    obstacleSpeed: 24,
    obstacleSpawnInterval: 0.5,
  },
}

export type LevelConfig = {
  // Configurable parameters
  phaseDurations: Record<LevelPhase, number>
  slowMoDuration: number
  obstacleSpawnInterval: number
  obstacleSpeed: number
  answerSpeed: number
}

type StoreState = LevelConfig & {
  setPhaseDurations: (durations: Record<LevelPhase, number>) => void
  setSlowMoDuration: (duration: number) => void
  setObstacleSpawnInterval: (interval: number) => void
  setObstacleSpeed: (speed: number) => void
  setAnswerSpeed: (speed: number) => void

  getLevelConfig: () => LevelConfig
}

export const useConfigStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_LEVEL_CONFIG,
      setPhaseDurations: (durations) => set({ phaseDurations: durations }),
      setSlowMoDuration: (duration) => set({ slowMoDuration: duration }),
      setObstacleSpawnInterval: (interval) => set({ obstacleSpawnInterval: interval }),
      setObstacleSpeed: (speed) => set({ obstacleSpeed: speed }),
      setAnswerSpeed: (speed) => set({ answerSpeed: speed }),

      getLevelConfig: () => ({
        phaseDurations: get().phaseDurations,
        slowMoDuration: get().slowMoDuration,
        obstacleSpawnInterval: get().obstacleSpawnInterval,
        obstacleSpeed: get().obstacleSpeed,
        answerSpeed: get().answerSpeed,
      }),
    }),
    {
      name: 'config',
    },
  ),
)
