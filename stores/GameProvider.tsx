import { type Vector3Tuple } from '@react-three/rapier'
import gsap from 'gsap'
import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

export enum GameStage {
  INTRO = 'INTRO',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export type GameState = {
  stage: GameStage
  setStage: (stage: GameStage) => void

  timeMultiplier: number
  setTimeMultiplier: (value: number) => void
  slowMoTimeRemaining: number
  isSlowMo: boolean
  goSlowMo: () => void

  maxObstacles: number
  setMaxObstacles: (value: number) => void
  spawnInterval: number
  setSpawnInterval: (value: number) => void

  playerPosition: Vector3Tuple
  setPlayerPosition: (pos: Vector3Tuple) => void

  health: number
  streak: number
  resetHealth: () => void
  onObstacleHit: () => void
  onAnswerHit: (isCorrect: boolean) => void

  reset: () => void
}

type GameStateStore = StoreApi<GameState>
const GameContext = createContext<GameStateStore>(undefined!)

export const GRID_SQUARE_SIZE_M = 2 // Meters
export const LANES_X = [-1, 0, 1].map((x) => x * GRID_SQUARE_SIZE_M)
export const LANES_Y = [-1, 0, 1].map((y) => y * GRID_SQUARE_SIZE_M)

export const SPAWN_OBSTACLE_Z = -20 as const
export const KILL_OBSTACLE_Z = 2 as const

export const MAX_HEALTH = 5 as const

const SLOW_MO_DURATION = 2.0

const INITIAL_STATE: Pick<
  GameState,
  | 'stage'
  | 'timeMultiplier'
  | 'slowMoTimeRemaining'
  | 'spawnInterval'
  | 'isSlowMo'
  | 'maxObstacles'
  | 'streak'
  | 'playerPosition'
  | 'health'
> = {
  stage: GameStage.INTRO,
  timeMultiplier: 1,
  slowMoTimeRemaining: SLOW_MO_DURATION,
  isSlowMo: false,
  maxObstacles: 10,
  spawnInterval: 0.8,
  streak: 0,
  playerPosition: [0, 0, 0] as Vector3Tuple,
  health: MAX_HEALTH,
}

const createGameStore = () => {
  let speedTimeline: GSAPTimeline
  // Create values which can be animated using GSAP (synced with store values which can't be mutated directly)
  const timeTweenTarget = { value: 1 }
  const slowMoTimeRemainingTarget = { value: SLOW_MO_DURATION }

  return createStore<GameState>()((set, get) => ({
    ...INITIAL_STATE,
    setStage: (stage: GameStage) => set({ stage }),
    setTimeMultiplier: (timeMultiplier: number) => set({ timeMultiplier }),
    goSlowMo: () => {
      if (get().isSlowMo) return

      set({ isSlowMo: true })
      gsap.set('#slow-mo-bar', { scaleX: 1, opacity: 1 })

      console.log('going slow mo')

      speedTimeline?.kill()
      speedTimeline = gsap
        .timeline({
          onComplete: () => {
            gsap.set('#slow-mo-bar', { scaleX: 1, opacity: 0 })
            set({ isSlowMo: false, slowMoTimeRemaining: SLOW_MO_DURATION })
          },
        })
        // Slow down..
        .to(timeTweenTarget, {
          duration: 0.6,
          ease: 'power3.out',
          value: 0.1,
          onUpdate: () => {
            set({ timeMultiplier: timeTweenTarget.value })
          },
        })
        .to('#slow-mo-bar', {
          scaleX: 0,
          duration: SLOW_MO_DURATION,
          ease: 'none',
          onUpdate: () => {
            set({ slowMoTimeRemaining: slowMoTimeRemainingTarget.value })
          },
        })
        // Speed back up again.
        .to(
          timeTweenTarget,
          {
            duration: 0.4,
            ease: 'power1.in',
            value: 1.0,
            onUpdate: () => {
              set({ timeMultiplier: timeTweenTarget.value })
            },
          },
          SLOW_MO_DURATION + 0.6,
        )
    },
    setMaxObstacles: (maxObstacles: number) => set({ maxObstacles }),
    setSpawnInterval: (spawnInterval: number) => set({ spawnInterval }),
    setPlayerPosition: (pos: [number, number, number]) => set({ playerPosition: pos }),
    resetHealth: () => set({ health: MAX_HEALTH }),
    onObstacleHit: () => {
      const currentHealth = get().health
      const newHealth = Math.max(currentHealth - 1, 0)
      if (newHealth === 0) {
        // Handle game over logic here
      }
      set({ health: newHealth })
    },
    onAnswerHit: (isCorrect: boolean) => {
      const currentHealth = get().health
      if (isCorrect) {
        const newHealth = Math.min(currentHealth + 1, MAX_HEALTH)
        set((s) => ({ streak: s.streak + 1, health: newHealth }))
      } else {
        const newHealth = Math.max(currentHealth - 1, 0)
        if (newHealth === 0) {
          // Handle game over logic here
        }
        set({ streak: 0, health: newHealth })
      }
    },

    reset: () => set(INITIAL_STATE),
  }))
}

const GameProvider: FC<PropsWithChildren> = ({ children }) => {
  // TODO: pass in the questions into the game store when it's created...
  const gameStore = useRef<GameStateStore>(createGameStore())
  return <GameContext.Provider value={gameStore.current}>{children}</GameContext.Provider>
}

export default GameProvider

export function useGameStore<T>(selector: (state: GameState) => T): T {
  const gameStore = useContext(GameContext)
  if (!gameStore) throw new Error('Missing GameContext.Provider in the tree')
  return useStore(gameStore, selector)
}

export function useGameStoreAPI(): GameStateStore {
  const gameStore = useContext(GameContext)
  if (!gameStore) throw new Error('Missing GameContext.Provider in the tree')
  return gameStore
}
