import 'dotenv/config'

import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './lib/db/schema.ts',
  dialect: 'postgresql',
  // Optionally limit generated SQL to these schemas
  schemaFilter: ['public'],
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
})
