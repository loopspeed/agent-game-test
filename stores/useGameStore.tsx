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

  obstaclesSpeed: number
  setObstaclesSpeed: (value: number) => void

  maxObstacles: number
  setMaxObstacles: (value: number) => void
  spawnInterval: number
  setSpawnInterval: (value: number) => void

  playerPosition: [number, number, number]
  setPlayerPosition: (pos: [number, number, number]) => void

  health: number
  streak: number
  resetHealth: () => void
  onObstacleHit: () => void
  onAnswerHit: (isCorrect: boolean) => void

  reset: () => void
}

type GameStateStore = StoreApi<GameState>

export const GRID_SQUARE_SIZE_M = 2 // Meters
export const LANES_X = [-1, 0, 1].map((x) => x * GRID_SQUARE_SIZE_M)
export const LANES_Y = [-1, 0, 1].map((y) => y * GRID_SQUARE_SIZE_M)

export const SPAWN_OBSTACLE_Z = -20 as const
export const KILL_OBSTACLE_Z = 2 as const

export const MAX_HEALTH = 10 as const

export const GameContext = createContext<GameStateStore>(undefined!)

const createGameStore = () => {
  // TODO: add speed manipulation methods here..

  return createStore<GameState>()((set, get) => ({
    stage: GameStage.INTRO,
    setStage: (stage: GameStage) => set({ stage }),

    obstaclesSpeed: 1,
    setObstaclesSpeed: (obstaclesSpeed: number) => set({ obstaclesSpeed }),

    maxObstacles: 20,
    setMaxObstacles: (maxObstacles: number) => set({ maxObstacles }),
    spawnInterval: 0.2,
    setSpawnInterval: (spawnInterval: number) => set({ spawnInterval }),

    playerPosition: [0, 0, 0],
    setPlayerPosition: (pos: [number, number, number]) => set({ playerPosition: pos }),

    health: MAX_HEALTH,
    streak: 0,
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
        set((state) => ({ streak: state.streak + 1, health: newHealth }))
      } else {
        const newHealth = Math.max(currentHealth - 1, 0)
        if (newHealth === 0) {
          // Handle game over logic here
        }
        set({ streak: 0, health: newHealth })
      }
    },

    reset: () =>
      set({
        obstaclesSpeed: 1,
        maxObstacles: 10,
        spawnInterval: 1,
        playerPosition: [0, 0, 0],
        health: 10,
      }),
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

export function useGameStoreApi(): GameStateStore {
  const gameStore = useContext(GameContext)
  if (!gameStore) throw new Error('Missing GameContext.Provider in the tree')
  return gameStore
}
