'use client'

import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()

  const onStartClick = () => {
    router.push('/game')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center space-y-6 text-center">
      <h1 className="text-5xl font-bold">Educational Runner</h1>

      <button
        onClick={onStartClick}
        className="rounded bg-teal-500 px-6 py-3 font-semibold text-black hover:bg-teal-600">
        Enter Game
      </button>
    </main>
  )
}
