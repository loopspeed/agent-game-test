import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { boolean, pgEnum, pgTable, uuid, varchar } from 'drizzle-orm/pg-core'

import { PlayerColour, PlayerShape } from '@/lib/types/player'

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
