import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { boolean, index, json, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

import { PlayerColour, PlayerShape } from '@/lib/types/player'
import type { Course } from '@/model/content'

export const PLAYER_COLOUR_VALUES = [PlayerColour.BLUE, PlayerColour.TEAL, PlayerColour.PURPLE] as const
export const PLAYER_SHAPE_VALUES = [PlayerShape.ORB] as const

export const playerColourEnum = pgEnum('player_colour', PLAYER_COLOUR_VALUES)
export const playerShapeEnum = pgEnum('player_shape', PLAYER_SHAPE_VALUES)

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
  colour: playerColourEnum('colour').notNull().default(PlayerColour.TEAL),
  shape: playerShapeEnum('shape').notNull().default(PlayerShape.ORB),
  hasSetupPlayer: boolean('hasSetupPlayer').notNull().default(false),
  hasSeenIntro: boolean('hasSeenIntro').notNull().default(false),
  hasSeenControls: boolean('hasSeenControls').notNull().default(false),
})

export type User = InferSelectModel<typeof user>
// Fields allowed to be updated via API/actions
export type UserUpdate = Partial<Omit<InferInsertModel<typeof user>, 'id'>>

// Draft schema for Chat, Messages, and "Test" Artifact.

export const chat = pgTable(
  'Chat',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    visibility: varchar('visibility', { enum: ['public', 'private'] })
      .notNull()
      .default('private'),
    // Optional usage or context info for last request; kept flexible.
    lastContext: jsonb('lastContext').$type<unknown | null>(),
  },
  (table) => ({
    chatUserIdCreatedAtIdx: index('Chat_userId_createdAt_idx').on(table.userId, table.createdAt),
  })
)

export type Chat = InferSelectModel<typeof chat>

export const message = pgTable(
  'Message',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    role: varchar('role').notNull(), // e.g. 'user' | 'assistant' | 'system'
    // Array of AI SDK message parts; stored as JSON for flexibility
    parts: json('parts').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    messageChatIdCreatedAtIdx: index('Message_chatId_createdAt_idx').on(table.chatId, table.createdAt),
  })
)

export type DBMessage = InferSelectModel<typeof message>

// A generated test artifact derived from a chat interaction
// Contains markdown and playable JSON (Course)
export const testArtifact = pgTable(
  'Test',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    createdAt: timestamp('createdAt').notNull(),
    markdown: text('markdown').notNull(),
    playable: jsonb('playable').notNull().$type<Course>(),
  },
  (table) => ({
    artifactChatIdCreatedAtIdx: index('Test_chatId_createdAt_idx').on(table.chatId, table.createdAt),
  })
)

export type TestArtifact = InferSelectModel<typeof testArtifact>
export type InsertTestArtifact = InferInsertModel<typeof testArtifact>
