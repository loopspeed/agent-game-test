import { useEffect, useRef } from 'react'

import { type ObstacleSpawnData, Phase, useWorldStore, useWorldStoreAPI } from '@/stores/WorldProvider'

import { useTimeSubscription } from './useTimeSubscription'

export function useObstaclesSpawning() {
  const storeAPI = useWorldStoreAPI()

  const isObstaclesPhase = useWorldStore((s) => s.phase === Phase.OBSTACLES)
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
