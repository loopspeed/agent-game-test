'use client'
import { Suspense } from 'react'

import Main from '@/components/game/Main'
import { useChatStore } from '@/hooks/useChatStore'
import { SoundProvider } from '@/stores/SoundProvider'

// Metadata..

function GamePage() {
  const hasHydratedChat = useChatStore((s) => s._hasHydrated)
  const getInitialMessages = useChatStore((s) => s.getInitialMessages)

  if (!hasHydratedChat) return null

  const initialMessages = getInitialMessages()

  return (
    <Suspense>
      <SoundProvider>
        <Main initialMessages={initialMessages} />
      </SoundProvider>
    </Suspense>
  )
}

export default GamePage
