// No explicit tag revalidation here; handled in DB layer
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { auth } from '@/app/(auth)/auth'
import GameClient from '@/components/game/GameClient'
import { getCachedUserById, updateUser } from '@/lib/db/queries'
import type { UserUpdate } from '@/lib/db/schema'

export default async function GamePage() {
  const session = await auth()
  if (!session) {
    redirect('/api/auth/guest?redirectUrl=/game')
  }
  console.warn('[AUTH] /game session', { session })

  const user = await getCachedUserById(session.user!.id)

  if (!user) {
    throw new Error('User not found')
  }

  console.warn('[USER]', { user })

  async function updateUserServer(updates: UserUpdate, onComplete?: () => void) {
    'use server'
    const session = await auth()
    if (!session?.user?.id) throw new Error('No session')
    console.warn('[ACTION] updateUser', { id: session.user.id, fields: Object.keys(updates) })
    await updateUser(session.user.id, updates)
    revalidatePath('/game')
    onComplete?.()
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GameClient updateUser={updateUserServer} user={user} />
    </Suspense>
  )
}
