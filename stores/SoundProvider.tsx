'use client'
import { createContext, type FC, type PropsWithChildren, useContext, useEffect, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

export enum SoundFX {
  CORRECT_ANSWER = 'CORRECT_ANSWER',
  WRONG_ANSWER = 'WRONG_ANSWER',
  OBSTACLE_HIT = 'OBSTACLE_HIT',
  OBSTACLE_AVOIDED = 'OBSTACLE_AVOIDED',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
}

const SOUND_FILES: Record<SoundFX, string> = {
  [SoundFX.GAME_OVER]: '/audio/',
  [SoundFX.LEVEL_COMPLETE]: '/audio/',
  [SoundFX.CORRECT_ANSWER]: '/audio/',
  [SoundFX.WRONG_ANSWER]: '/audio/',
  [SoundFX.OBSTACLE_AVOIDED]: '/audio/',
  [SoundFX.OBSTACLE_HIT]: '/audio/',
}

type Buffers = Partial<Record<SoundFX, AudioBuffer>>

type SoundState = {
  isLoading: boolean
  initialise: () => Promise<void>
  playSoundFX: (fx: SoundFX) => void
  setMasterGain: (v: number) => void
}

type SoundStore = StoreApi<SoundState>
const SoundContext = createContext<SoundStore>(undefined!)

const createSoundStore = () => {
  let audioCtx: AudioContext | null = null
  let master: GainNode | null = null
  let buffers: Buffers = {}

  async function ensureCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      master = audioCtx.createGain()
      master.connect(audioCtx.destination)
      master.gain.value = 0.8
    }
    if (audioCtx.state === 'suspended') {
      // Must be resumed by a user gesture

      await audioCtx.resume().catch(() => {})
    }
    return { audioCtx, master }
  }

  async function loadAll(): Promise<void> {
    const { audioCtx } = await ensureCtx()
    const entries = await Promise.all(
      Object.entries(SOUND_FILES).map(async ([fx, url]) => {
        const res = await fetch(url)
        const arr = await res.arrayBuffer()
        const buf = await audioCtx.decodeAudioData(arr)
        return [fx as SoundFX, buf] as const
      }),
    )
    buffers = Object.fromEntries(entries)
  }

  return createStore<SoundState>()((set) => ({
    isLoading: true,

    initialise: async () => {
      await loadAll()
      set({ isLoading: false })
    },

    playSoundFX: (fx: SoundFX) => {
      if (!buffers[fx] || !audioCtx || !master) return
      const src = audioCtx.createBufferSource()
      src.buffer = buffers[fx]!
      src.connect(master)
      try {
        src.start(0)
      } catch {
        // ignore
      }
    },

    setMasterGain: (v: number) => {
      if (master) {
        master.gain.value = Math.max(0, Math.min(1, v))
      }
    },
  }))
}

export const SoundProvider: FC<PropsWithChildren> = ({ children }) => {
  const soundStore = useRef<SoundStore>(createSoundStore())

  useEffect(() => {}, [])

  return <SoundContext.Provider value={soundStore.current}>{children}</SoundContext.Provider>
}

export function useSoundStore<T>(selector: (state: SoundState) => T): T {
  const soundStore = useContext(SoundContext)
  if (!soundStore) throw new Error('Missing SoundContext.Provider in the tree')
  return useStore(soundStore, selector)
}
