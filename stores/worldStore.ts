import { create } from 'zustand'

interface WorldState {
  speed: number
  maxObstacles: number
  spawnInterval: number

  lanesX: number[]
  lanesY: number[]
  playerPosition: [number, number, number]
  setPlayerPosition: (pos: [number, number, number]) => void

  isPlaying: boolean
  toggleIsPlaying: () => void
}

export const GRID_SCALE = 2
const LANES_X = [-1, 0, 1].map((x) => x * GRID_SCALE)
const LANES_Y = [-1, 0, 1].map((y) => y * GRID_SCALE)
console.log({ LANES_X, LANES_Y })

export const SPAWN_OBSTACLE_Z = -20
export const KILL_OBSTACLE_Z = 2

export const useWorldStore = create<WorldState>((set) => ({
  speed: 10,
  maxObstacles: 30,
  spawnInterval: 1,

  // Define vertical lanes for a 3×3 grid (mirroring horizontal lanes)
  lanesX: LANES_X,
  lanesY: LANES_Y,
  playerPosition: [0, 0, 0],
  setPlayerPosition: (pos) => set({ playerPosition: pos }),

  isPlaying: false,
  toggleIsPlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
}))
