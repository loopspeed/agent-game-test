import { create } from 'zustand'

interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  setKey: (key: 'up' | 'down' | 'left' | 'right', value: boolean) => void
}

export const useInputStore = create<InputState>((set) => ({
  up: false,
  down: false,
  left: false,
  right: false,
  setKey: (key, value) => set(() => ({ [key]: value })),
}))
