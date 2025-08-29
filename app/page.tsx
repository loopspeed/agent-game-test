'use client'
import { useRouter } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'

export default function HomePage() {
  const router = useRouter()
  const reset = useGameStore((s) => s.reset)

  const onStartClick = () => {
    reset()
    router.push('/game')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-6 text-center">
      <h1 className="text-5xl font-bold">Educational Runner</h1>
      <p className="max-w-md text-gray-400">
        Read a snippet, then steer your ship through the gate with the correct answer. Use arrow keys or WASD to move.
      </p>
      <button
        onClick={onStartClick}
        className="rounded bg-teal-500 px-6 py-3 font-semibold text-black hover:bg-teal-600">
        Start Game
      </button>
    </main>
  )
}
