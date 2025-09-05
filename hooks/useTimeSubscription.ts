import { useEffect, useRef } from 'react'

import { GameStage, useGameStore } from '@/stores/GameProvider'
import { useWorldStoreAPI } from '@/stores/WorldProvider'

export function useTimeSubscription(onTimeMultiplierChange?: (time: number) => void) {
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const storeAPI = useWorldStoreAPI()

  // Subscribe to frequently changing state changes
  const gameTime = useRef(0)
  const timeMultiplier = useRef(storeAPI.getState().timeMultiplier) // Fetch initial state

  useEffect(
    () =>
      storeAPI.subscribe((state, prevState) => {
        if (!isPlaying) return
        if (state.gameTime === prevState.gameTime) return
        gameTime.current = state.gameTime
      }),
    [storeAPI, isPlaying],
  )

  useEffect(
    () =>
      storeAPI.subscribe((state, prevState) => {
        if (!isPlaying) return
        if (state.timeMultiplier === prevState.timeMultiplier) return
        timeMultiplier.current = state.timeMultiplier
        onTimeMultiplierChange?.(timeMultiplier.current)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeAPI, isPlaying],
  )

  return {
    gameTime,
    timeMultiplier,
  }
}
