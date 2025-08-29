import { create } from 'zustand';

export type Phase = 'read' | 'test' | 'summary';

interface GameState {
  phase: Phase;
  score: number;
  streak: number;
  health: number;
  questionIndex: number;
  setPhase: (phase: Phase) => void;
  incrementScore: () => void;
  decrementHealth: () => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'read',
  score: 0,
  streak: 0,
  health: 3,
  questionIndex: 0,
  setPhase: (phase) => set({ phase }),
  incrementScore: () =>
    set((state) => ({ score: state.score + 1, streak: state.streak + 1 })),
  decrementHealth: () => set((state) => ({ health: state.health - 1, streak: 0 })),
  reset: () => set({ phase: 'read', score: 0, streak: 0, health: 3, questionIndex: 0 }),
}));