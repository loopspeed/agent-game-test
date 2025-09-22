'use server'

import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { revalidateTag, unstable_cache } from 'next/cache'
import postgres from 'postgres'

import { PlayerColour, PlayerShape } from '@/lib/types/player'
import { generateUUID } from '@/utils/helpers'

import { type User, user, type UserUpdate } from './schema'
import { generateHashedPassword } from './utils'

// biome-ignore lint: non-null asserted to surface helpful error on missing env
const client = postgres(process.env.POSTGRES_URL!)
const db = drizzle(client)

export async function getUser(email: string): Promise<User[]> {
  try {
    console.warn('[DB] getUser called', { email })
    const rows = await db.select().from(user).where(eq(user.email, email))
    console.warn('[DB] getUser result', { count: rows.length, ids: rows.map((r) => r.id) })
    return rows
  } catch (error) {
    console.error('[DB] getUser error', error)
    throw new Error('Failed to get user by email')
  }
}

// Raw DB getter (uncached)
export async function getUserById(id: string): Promise<User | null> {
  try {
    console.warn('[DB] getUserById called', { id })
    const [u] = await db.select().from(user).where(eq(user.id, id))
    console.warn('[DB] getUserById result', { found: !!u })
    return u ?? null
  } catch (error) {
    console.error('[DB] getUserById error', error)
    throw new Error('Failed to get user by id')
  }
}

// Cached getter with tag-based revalidation (single 'user' tag)
export async function getCachedUserById(id: string): Promise<User | null> {
  const getCached = unstable_cache(async () => getUserById(id), ['get-user-by-id', id], {
    tags: ['user'],
  })
  return getCached()
}

export async function createUser(email: string, password: string, opts?: Pick<UserUpdate, 'colour' | 'shape'>) {
  const hashedPassword = generateHashedPassword(password)
  try {
    console.warn('[DB] createUser called', { email, colour: opts?.colour, shape: opts?.shape })
    const res = await db.insert(user).values({
      email,
      password: hashedPassword,
      colour: opts?.colour ?? PlayerColour.TEAL,
      shape: opts?.shape ?? PlayerShape.ORB,
    })
    console.warn('[DB] createUser inserted')
    // Invalidate cached user data across the app
    revalidateTag('user')
    return res
  } catch (error) {
    console.error('[DB] createUser error', error)
    throw new Error('Failed to create user')
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`
  const password = generateHashedPassword(generateUUID())
  try {
    console.warn('[DB] createGuestUser called', { email })
    const res = await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    })
    console.warn('[DB] createGuestUser created', res?.[0])
    return res
  } catch (error) {
    console.error('[DB] createGuestUser error', error)
    throw new Error('Failed to create guest user')
  }
}

export async function updateUser(id: string, updates: UserUpdate) {
  try {
    console.warn('[DB] updateUser called', { id, fields: Object.keys(updates) })

    if (Object.keys(updates).length === 0) {
      console.warn('[DB] updateUser called with no changes', { id })
      return []
    }

    const set: UserUpdate = { ...updates }
    if (!!updates.password) set.password = generateHashedPassword(updates.password)

    const res = await db.update(user).set(set).where(eq(user.id, id)).returning({
      id: user.id,
      email: user.email,
    })
    console.warn('[DB] updateUser updated', res?.[0])
    // Invalidate cached user data across the app
    revalidateTag('user')
    return res
  } catch (error) {
    console.error('[DB] updateUser error', error)
    throw new Error('Failed to update user')
  }
}
