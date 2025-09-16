import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { LevelPhase } from '@/model/game'

const DEFAULT_PHASE_DURATIONS: Record<LevelPhase, number> = {
  CONFIG: 100000, // For level config - effectively infinite until player starts
  INTRO: 1, // READONLY For entry animation and get-ready
  ONBOARDING: 100000, // READONLY Effectively infinite until player completels onboarding - then phase is advanced manually
  REST: 1, // READONLY Short rest before obstacles
  OBSTACLES: 6, // EDITABLE Duration for obstacles phase (0 = No obstacles)
  QUESTION: 100000, // READONLY Effectively infinite until question is answered and the gate is killed - then phase is advanced manually
  OUTRO: 100000, // READONLY For showing "level complete" and other end of level stuff
} as const

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

const DEFAULT_ANSWER_TIME_DURATION = 4.0 // Seconds to answer each question

export const DEFAULT_LEVEL_CONFIG: LevelConfig = {
  showOnboarding: false,
  phaseDurations: DEFAULT_PHASE_DURATIONS,
  answerTimeDuration: DEFAULT_ANSWER_TIME_DURATION,
  ...OBSTACLE_PRESETS['Normal'],
  answerSpeed: 10, // Base speed for answer gates
}

export type LevelConfig = {
  // Configurable parameters
  showOnboarding: boolean
  phaseDurations: Record<LevelPhase, number>
  answerTimeDuration: number
  obstacleSpawnInterval: number
  obstacleSpeed: number
  answerSpeed: number
}

type StoreState = LevelConfig & {
  setShowOnboarding: (show: boolean) => void
  setPhaseDurations: (durations: Record<LevelPhase, number>) => void
  setAnswerTimeDuration: (duration: number) => void
  setObstacleSpawnInterval: (interval: number) => void
  setObstacleSpeed: (speed: number) => void
  setAnswerSpeed: (speed: number) => void
  getLevelConfig: () => LevelConfig
}

export const useConfigStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_LEVEL_CONFIG,
      setShowOnboarding: (showOnboarding) => set({ showOnboarding }),
      setPhaseDurations: (durations) => set({ phaseDurations: durations }),
      setAnswerTimeDuration: (duration) => set({ answerTimeDuration: duration }),
      setObstacleSpawnInterval: (interval) => set({ obstacleSpawnInterval: interval }),
      setObstacleSpeed: (speed) => set({ obstacleSpeed: speed }),
      setAnswerSpeed: (speed) => set({ answerSpeed: speed }),
      getLevelConfig: () => ({
        showOnboarding: get().showOnboarding,
        phaseDurations: get().phaseDurations,
        answerTimeDuration: get().answerTimeDuration,
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
