import { useEffect, useRef } from 'react'

import { LevelPhase } from '@/model/game'
import { useLevelStore, useLevelStoreAPI } from '@/stores/LevelProvider'

export function useTimeSubscription(onTimeMultiplierChange?: (time: number) => void) {
  const isPlaying = useLevelStore((s) => s.phase !== LevelPhase.CONFIG)
  const levelStoreAPI = useLevelStoreAPI()

  // Subscribe to frequently changing state changes
  const totalTime = useRef(0)
  const timeMultiplier = useRef(levelStoreAPI.getState().timeMultiplier) // Fetch initial state

  useEffect(
    () =>
      levelStoreAPI.subscribe((state, prevState) => {
        if (!isPlaying) return
        if (state.totalTime === prevState.totalTime) return
        totalTime.current = state.totalTime
      }),
    [levelStoreAPI, isPlaying],
  )

  useEffect(
    () =>
      levelStoreAPI.subscribe((state, prevState) => {
        if (!isPlaying) return
        if (state.timeMultiplier === prevState.timeMultiplier) return
        timeMultiplier.current = state.timeMultiplier
        onTimeMultiplierChange?.(timeMultiplier.current)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [levelStoreAPI, isPlaying],
  )

  return {
    totalTime,
    timeMultiplier,
  }
}
