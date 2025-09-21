'use client'
import { Suspense, useLayoutEffect } from 'react'

import Main from '@/components/Main'
import { useChatStore } from '@/hooks/useChatStore'
import useNavigation, { Stage } from '@/hooks/useGameNavigation'
import { useUserStore } from '@/hooks/useUserStore'
import { SoundProvider } from '@/stores/SoundProvider'

// Metadata..

function GameContent() {
  const { stage, goToStage } = useNavigation()
  // Load user
  const hasSetupPlayer = useUserStore((s) => s.hasSetupPlayer)
  const hasHydratedUser = useUserStore((s) => s._hasHydrated)
  // Load Chats
  const hasHydratedChat = useChatStore((s) => s._hasHydrated)
  const getInitialMessages = useChatStore((s) => s.getInitialMessages)

  useLayoutEffect(() => {
    // Redirect to player setup if user hasn't set up their player yet
    if (!hasHydratedUser || !!stage) return
    if (!hasSetupPlayer) {
      goToStage(Stage.PlayerSetup)
    } else {
      goToStage(Stage.Chat)
    }
  }, [goToStage, stage, hasSetupPlayer, hasHydratedUser])

  if (!hasHydratedChat || !hasHydratedUser) return null

  const initialMessages = getInitialMessages()

  return (
    <SoundProvider>
      <Main initialMessages={initialMessages} />
    </SoundProvider>
  )
}

function GamePage() {
  return (
    <Suspense fallback={null}>
      <GameContent />
    </Suspense>
  )
}

export default GamePage
