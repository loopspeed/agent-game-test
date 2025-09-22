import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  providers: [
    // Providers are added in auth.ts (Node-only deps)
  ],
  callbacks: {},
} satisfies NextAuthConfig
