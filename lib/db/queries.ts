'use server'

import { desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { revalidateTag, unstable_cache } from 'next/cache'
import postgres from 'postgres'

import { PlayerColour, PlayerShape } from '@/lib/types/player'
import { generateUUID } from '@/utils/helpers'

import { chat, message, testArtifact, type Chat, type DBMessage, type TestArtifact, type User, user, type UserUpdate } from './schema'
import type { Course } from '@/model/content'
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

// CHAT QUERIES
export async function createChat(userId: string, title: string, opts?: { visibility?: 'public' | 'private'; lastContext?: unknown | null; createdAt?: Date }) {
  try {
    const createdAt = opts?.createdAt ?? new Date()
    const visibility = opts?.visibility ?? 'private'
    const res = await db
      .insert(chat)
      .values({ userId, title, createdAt, visibility, lastContext: opts?.lastContext ?? null })
      .returning()
    // Invalidate cached chat data
    revalidateTag('chat')
    return res[0]
  } catch (error) {
    console.error('[DB] createChat error', error)
    throw new Error('Failed to create chat')
  }
}

export async function getChatById(id: string): Promise<Chat | null> {
  try {
    const [row] = await db.select().from(chat).where(eq(chat.id, id))
    return row ?? null
  } catch (error) {
    console.error('[DB] getChatById error', error)
    throw new Error('Failed to get chat by id')
  }
}

export async function getChatsForUser(userId: string): Promise<Chat[]> {
  try {
    const rows = await db.select().from(chat).where(eq(chat.userId, userId)).orderBy(desc(chat.createdAt))
    return rows
  } catch (error) {
    console.error('[DB] getChatsForUser error', error)
    throw new Error('Failed to get chats for user')
  }
}

// MESSAGE QUERIES
export async function getMessagesForChat(chatId: string): Promise<DBMessage[]> {
  try {
    const rows = await db.select().from(message).where(eq(message.chatId, chatId)).orderBy(message.createdAt)
    return rows
  } catch (error) {
    console.error('[DB] getMessagesForChat error', error)
    throw new Error('Failed to get messages for chat')
  }
}

export async function createMessage(
  chatId: string,
  role: string,
  parts: unknown,
  opts?: { createdAt?: Date }
): Promise<DBMessage> {
  try {
    const createdAt = opts?.createdAt ?? new Date()
    const [row] = await db
      .insert(message)
      .values({ chatId, role, parts, createdAt })
      .returning()
    revalidateTag('message')
    return row
  } catch (error) {
    console.error('[DB] createMessage error', error)
    throw new Error('Failed to create message')
  }
}

// TEST ARTIFACT QUERIES
export async function createTestArtifact(
  chatId: string,
  markdown: string,
  playable: Course,
  opts?: { createdAt?: Date }
): Promise<TestArtifact> {
  try {
    const createdAt = opts?.createdAt ?? new Date()
    const [row] = await db
      .insert(testArtifact)
      .values({ chatId, createdAt, markdown, playable })
      .returning()
    revalidateTag('artifact')
    return row
  } catch (error) {
    console.error('[DB] createTestArtifact error', error)
    throw new Error('Failed to create test artifact')
  }
}

export async function getLatestTestArtifact(chatId: string): Promise<TestArtifact | null> {
  try {
    const [row] = await db
      .select()
      .from(testArtifact)
      .where(eq(testArtifact.chatId, chatId))
      .orderBy(desc(testArtifact.createdAt))
      .limit(1)
    return row ?? null
  } catch (error) {
    console.error('[DB] getLatestTestArtifact error', error)
    throw new Error('Failed to get latest test artifact')
  }
}

export async function getTestArtifactsForChat(chatId: string): Promise<TestArtifact[]> {
  try {
    const rows = await db
      .select()
      .from(testArtifact)
      .where(eq(testArtifact.chatId, chatId))
      .orderBy(desc(testArtifact.createdAt))
    return rows
  } catch (error) {
    console.error('[DB] getTestArtifactsForChat error', error)
    throw new Error('Failed to get test artifacts for chat')
  }
}
