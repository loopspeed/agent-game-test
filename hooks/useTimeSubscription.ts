import { useEffect, useRef } from 'react'

import { GameStage, useGameStore, useGameStoreAPI } from '@/stores/GameProvider'

export function useTimeSubscription(onTimeChange: (time: number) => void) {
  const isPlaying = useGameStore((s) => s.stage === GameStage.PLAYING)
  const gameStoreAPI = useGameStoreAPI()
  const timeMultiplier = useRef(gameStoreAPI.getState().timeMultiplier) // Fetch initial state
  useEffect(
    () =>
      // Subscribe to state changes
      gameStoreAPI.subscribe((state, prevState) => {
        if (!isPlaying) return
        if (state.timeMultiplier === prevState.timeMultiplier) return
        timeMultiplier.current = state.timeMultiplier
        onTimeChange(timeMultiplier.current)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameStoreAPI, isPlaying],
  )

  return {
    timeMultiplier,
  }
}
