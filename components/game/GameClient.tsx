'use client'
import { type FC, useLayoutEffect } from 'react'

import Main from '@/components/Main'
import { useChatStore } from '@/hooks/useChatStore'
import useNavigation, { Stage } from '@/hooks/useGameNavigation'
import type { User, UserUpdate } from '@/lib/db/schema'
import { SoundProvider } from '@/stores/SoundProvider'

type Props = {
  user: User
  updateUser: (updates: UserUpdate, onComplete?: () => void) => Promise<void>
}

const GameClient: FC<Props> = ({ user, updateUser }) => {
  const { stage, goToStage } = useNavigation()
  const hasHydratedChat = useChatStore((s) => s._hasHydrated)
  const getInitialMessages = useChatStore((s) => s.getInitialMessages)

  useLayoutEffect(() => {
    if (!user.hasSetupPlayer) goToStage(Stage.PlayerSetup)
    if (!!stage) return
    if (user.hasSetupPlayer) goToStage(Stage.Chat)
  }, [goToStage, stage, user.hasSetupPlayer])

  if (!hasHydratedChat) return null

  const initialMessages = getInitialMessages()

  return (
    <SoundProvider>
      <Main initialMessages={initialMessages} updateUser={updateUser} user={user} />
    </SoundProvider>
  )
}

export default GameClient
