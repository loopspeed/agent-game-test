import { Suspense } from 'react'

import Main from '@/components/game/Main'
import { SoundProvider } from '@/stores/SoundProvider'

// Metadata..

function GamePage() {
  return (
    <Suspense>
      <SoundProvider>
        <Main />
      </SoundProvider>
    </Suspense>
  )
}

export default GamePage
