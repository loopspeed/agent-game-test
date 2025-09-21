'use client'
import { Suspense } from 'react'

import Main from '@/components/Main'
import { useChatStore } from '@/hooks/useChatStore'
import { useUserStore } from '@/hooks/useUserStore'
import { SoundProvider } from '@/stores/SoundProvider'

// Metadata..

function GamePage() {
  const hasHydratedChat = useChatStore((s) => s._hasHydrated)
  const hasHydratedUser = useUserStore((s) => s._hasHydrated)
  const getInitialMessages = useChatStore((s) => s.getInitialMessages)

  if (!hasHydratedChat || !hasHydratedUser) return null

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
