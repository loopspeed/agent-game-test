import { createContext, type FC, type PropsWithChildren, useContext, useEffect, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

enum SoundFX {
  CORRECT_ANSWER = 'CORRECT_ANSWER',
  WRONG_ANSWER = 'WRONG_ANSWER',
  OBSTACLE_HIT = 'OBSTACLE_HIT',
  OBSTACLE_AVOIDED = 'OBSTACLE_AVOIDED',
}

type SoundState = {
  isLoading: boolean
  playSound: (fx: SoundFX) => void
}

type SoundStore = StoreApi<SoundState>
const SoundContext = createContext<SoundStore>(undefined!)

const createSoundStore = () => {
  // Loads sounds here OR in the useEffect of SoundProvider

  return createStore<SoundState>()((set, get) => ({
    isLoading: true,
    playSound: (fx: SoundFX) => {
      console.log('🔊 Playing sound:', fx)
      // Play sound logic here
    },
  }))
}

export const SoundProvider: FC<PropsWithChildren> = ({ children }) => {
  const soundStore = useRef<SoundStore>(createSoundStore())

  useEffect(() => {
    // Download tracks so they are ready to play..
  }, [])

  return <SoundContext.Provider value={soundStore.current}>{children}</SoundContext.Provider>
}

export function useSoundStore<T>(selector: (state: SoundState) => T): T {
  const soundStore = useContext(SoundContext)
  if (!soundStore) throw new Error('Missing SoundContext.Provider in the tree')
  return useStore(soundStore, selector)
}
