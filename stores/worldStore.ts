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
  laneY: [-1, 0, 1],
}));