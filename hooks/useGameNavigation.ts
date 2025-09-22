'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export enum Stage {
  PlayerSetup = 'player', // Player customization
  Chat = 'chat', // Chat with the agent
  Level = 'level', // Play the game level
}

const useNavigation = () => {
  const { push } = useRouter()
  const searchParams = useSearchParams()
  const stage = searchParams.get('stage') as Stage | null

  const goToStage = useCallback(
    (stage: Stage) => {
      push(`/game?stage=${stage}`)
    },
    [push],
  )

  return { stage, goToStage }
}

export default useNavigation
