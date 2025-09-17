'use client'
import { usePrevious } from '@mantine/hooks'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLayoutEffect } from 'react'

export enum Stage {
  PlayerSetup = 'player-setup', // Player customization
  Chat = 'chat', // Chat with the agent
  Level = 'level', // Play the game level
  LevelComplete = 'level-complete', // Level complete screen - might be better to merge in with the chat and provider a summary of performance in custom UI
}

const useNavigation = () => {
  const { push } = useRouter()
  const searchParams = useSearchParams()
  const stage = searchParams.get('stage') as Stage | null
  const prevStage = usePrevious(stage)

  useLayoutEffect(() => {
    // TODO: determine if they have already set up their player or not...
    if (!stage) push(`/game?stage=${Stage.PlayerSetup}`)
  }, [push, stage])

  const goToStage = (stage: Stage) => {
    push(`/game?stage=${stage}`)
  }

  return { stage, goToStage, prevStage }
}

export default useNavigation
