// Create a Zustand store for user/player state management

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { PlayerColour, PlayerShape } from '@/model/player'

type Store = {
  colour: PlayerColour
  shape: PlayerShape
  setColour: (colour: PlayerColour) => void
  setShape: (shape: PlayerShape) => void

  // Hydration state
  _hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
}

export const useUserStore = create<Store>()(
  persist(
    (set) => ({
      // Default values
      colour: PlayerColour.TEAL,
      shape: PlayerShape.ORB,
      setColour: (colour) => set({ colour }),
      setShape: (shape) => set({ shape }),

      // Hydration state
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'user-storage', // unique name for localStorage key
      partialize: (state) => ({
        // Only persist the user preferences, not hydration state
        colour: state.colour,
        shape: state.shape,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('User store hydration failed:', error)
          } else {
            console.warn('User store hydrated successfully', state)
            state?.setHasHydrated(true)
          }
        }
      },
    },
  ),
)
