import { create } from 'zustand';

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
}

export const useWorldStore = create<WorldState>(() => ({
  speed: 5,
  accel: 0,
  maxSpeed: 10,
  spawnZ: 15,
  killZ: -5,
  ringSpacing: 5,
  ringRadius: 3,
  laneX: [-2, 0, 2],
  // Define vertical lanes for a 3×3 grid (mirroring horizontal lanes)
  laneY: [-2, 0, 2],
}));