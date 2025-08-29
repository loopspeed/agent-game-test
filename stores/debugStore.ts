import { create } from 'zustand';

interface DebugState {
  showColliders: boolean;
  physicsDebug: boolean;
  seed: number;
  godMode: boolean;
  toggle: (key: 'showColliders' | 'physicsDebug' | 'godMode') => void;
  setSeed: (seed: number) => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  showColliders: false,
  physicsDebug: false,
  seed: 0,
  godMode: false,
  toggle: (key) => set((state) => ({ [key]: !state[key] })),
  setSeed: (seed) => set({ seed }),
}));