import { create } from "zustand";

interface WorldState {
  speed: number;
  accel: number;
  maxSpeed: number;
  spawnZ: number;
  killZ: number;
  // ringSpacing: number;
  // ringRadius: number;
  maxObstacles: number;
  spawnInterval: number;

  laneX: number[];
  laneY: number[];
  playerPosition: [number, number, number];
  setPlayerPosition: (pos: [number, number, number]) => void;

  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

const GRID_SCALE = 2;

export const useWorldStore = create<WorldState>((set) => ({
  speed: 8,
  accel: 0,
  maxSpeed: 16,
  spawnZ: -30,
  killZ: 5,
  // ringSpacing: 5,
  // ringRadius: 3,
  maxObstacles: 5,
  spawnInterval: 3,

  // Define vertical lanes for a 3×3 grid (mirroring horizontal lanes)
  laneX: [-1, 0, 1].map((x) => x * GRID_SCALE),
  laneY: [-1, 0, 1].map((y) => y * GRID_SCALE),
  playerPosition: [0, 0, 0],
  setPlayerPosition: (pos) => set({ playerPosition: pos }),

  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
}));
