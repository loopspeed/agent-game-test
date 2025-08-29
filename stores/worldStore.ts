import { create } from "zustand";

interface WorldState {
  speed: number;
  accel: number;
  maxSpeed: number;
  spawnZ: number;
  killZ: number;
  ringSpacing: number;
  ringRadius: number;

  laneX: number[];
  laneY: number[];
  playerPosition: [number, number, number];
  setPlayerPosition: (pos: [number, number, number]) => void;
}

const GRID_SCALE = 2;

export const useWorldStore = create<WorldState>((set) => ({
  speed: 5,
  accel: 0,
  maxSpeed: 10,
  spawnZ: 15,
  killZ: -5,
  ringSpacing: 5,
  ringRadius: 3,

  // Define vertical lanes for a 3×3 grid (mirroring horizontal lanes)
  laneX: [-1, 0, 1].map((x) => x * GRID_SCALE),
  laneY: [-1, 0, 1].map((y) => y * GRID_SCALE),
  playerPosition: [0, 0, 0],
  setPlayerPosition: (pos) => set({ playerPosition: pos }),
}));
