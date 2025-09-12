import { create } from 'zustand'

export type InputState = {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

type InputStore = InputState & {
  setKey: (key: 'up' | 'down' | 'left' | 'right', value: boolean) => void
}

export const useInputStore = create<InputStore>((set) => ({
  up: false,
  down: false,
  left: false,
  right: false,
  setKey: (key, value) => set(() => ({ [key]: value })),
}))
