import { useEffect, useRef } from 'react'

import { LevelPhase } from '@/model/game'
import { type ObstacleSpawnData, useLevelStore, useLevelStoreAPI } from '@/stores/LevelProvider'

import { useTimeSubscription } from './useTimeSubscription'

export function useObstaclesSpawning() {
  const storeAPI = useLevelStoreAPI()

  const isObstaclesPhase = useLevelStore((s) => s.phase === LevelPhase.OBSTACLES)
  const obstaclesToSpawn = useRef<ObstacleSpawnData[]>(storeAPI.getState().obstacles) // Fetch initial state

  const { gameTime } = useTimeSubscription()

  useEffect(
    () =>
      // Subscribe to state changes
      storeAPI.subscribe((state, prevState) => {
        obstaclesToSpawn.current = state.obstacles
      }),
    [storeAPI, isObstaclesPhase],
  )

  return { gameTime, obstaclesToSpawn }
}
