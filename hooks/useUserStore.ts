// Create a Zustand store for user/player state management

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { PlayerColour, PlayerShape } from '@/model/player'

type Store = {
  colour: PlayerColour
  shape: PlayerShape
  setColour: (colour: PlayerColour) => void
  setShape: (shape: PlayerShape) => void

  // Onboarding state
  hasSetupPlayer: boolean
  hasSeenIntro: boolean
  hasSeenControls: boolean
  setHasSetupPlayer: (value: boolean) => void
  setHasSeenIntro: (value: boolean) => void
  setHasSeenControls: (value: boolean) => void

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

      // Onboarding state
      hasSetupPlayer: false,
      hasSeenIntro: false,
      hasSeenControls: false,
      setHasSetupPlayer: (value) => set({ hasSetupPlayer: value }),
      setHasSeenIntro: (value) => set({ hasSeenIntro: value }),
      setHasSeenControls: (value) => set({ hasSeenControls: value }),

      // Hydration state
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'user-storage', // unique name for localStorage key
      partialize: (state) => ({
        // Only persist the user preferences and onboarding state, not hydration state
        colour: state.colour,
        shape: state.shape,
        hasSetupPlayer: state.hasSetupPlayer,
        hasSeenIntro: state.hasSeenIntro,
        hasSeenControls: state.hasSeenControls,
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
