import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const OBSTACLE_PRESETS: Record<string, Pick<LevelConfig, 'obstacleSpeed' | 'obstacleSpawnInterval'>> = {
  Off: {
    obstacleSpeed: 0,
    obstacleSpawnInterval: 10000,
  },
  Chilled: {
    obstacleSpeed: 10,
    obstacleSpawnInterval: 2.0,
  },
  Normal: {
    obstacleSpeed: 14,
    obstacleSpawnInterval: 1.0,
  },
  Fast: {
    obstacleSpeed: 18,
    obstacleSpawnInterval: 0.75,
  },
  Insane: {
    obstacleSpeed: 24,
    obstacleSpawnInterval: 0.5,
  },
}

const DEFAULT_ANSWER_TIME_DURATION = 10.0 // Seconds to answer each question

export const DEFAULT_LEVEL_CONFIG: LevelConfig = {
  showOnboarding: false,
  includeObstacles: true,
  answerTimeDuration: DEFAULT_ANSWER_TIME_DURATION,
  ...OBSTACLE_PRESETS['Normal'],
  answerSpeed: 10, // Base speed for answer gates
}

export type LevelConfig = {
  // Configurable parameters
  showOnboarding: boolean
  answerTimeDuration: number
  includeObstacles: boolean
  obstacleSpawnInterval: number
  obstacleSpeed: number
  answerSpeed: number
}

type StoreState = LevelConfig & {
  setShowOnboarding: (show: boolean) => void
  setAnswerTimeDuration: (duration: number) => void
  setIncludeObstacles: (include: boolean) => void
  setObstacleSpawnInterval: (interval: number) => void
  setObstacleSpeed: (speed: number) => void
  setAnswerSpeed: (speed: number) => void
  getLevelConfig: () => LevelConfig
}

export const useLevelConfigStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_LEVEL_CONFIG,
      setShowOnboarding: (showOnboarding) => set({ showOnboarding }),
      setAnswerTimeDuration: (duration) => set({ answerTimeDuration: duration }),
      setIncludeObstacles: (include) => set({ includeObstacles: include }),
      setObstacleSpawnInterval: (interval) => set({ obstacleSpawnInterval: interval }),
      setObstacleSpeed: (speed) => set({ obstacleSpeed: speed }),
      setAnswerSpeed: (speed) => set({ answerSpeed: speed }),
      getLevelConfig: () => ({
        showOnboarding: get().showOnboarding,
        answerTimeDuration: get().answerTimeDuration,
        obstacleSpawnInterval: get().obstacleSpawnInterval,
        obstacleSpeed: get().obstacleSpeed,
        answerSpeed: get().answerSpeed,
        includeObstacles: get().includeObstacles,
      }),
    }),
    {
      name: 'config',
    },
  ),
)
