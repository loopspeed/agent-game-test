import { compare } from 'bcrypt-ts'
import NextAuth, { type DefaultSession } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'
import Credentials from 'next-auth/providers/credentials'

import { DUMMY_PASSWORD } from '@/lib/constants'
import { createGuestUser, getUser } from '@/lib/db/queries'
import { generateUUID } from '@/utils/helpers'

import { authConfig } from './auth.config'

export type UserType = 'guest' | 'regular'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string
      type: UserType
    } & DefaultSession['user']
  }

  interface User {
    id?: string
    email?: string | null
    type: UserType
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    type: UserType
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  debug: process.env.NODE_ENV === 'development',
  providers: [
    // Regular user via credentials and DB lookup
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email || '').toString().trim()
        const password = (credentials?.password || '').toString()

        if (!email || !password) return null

        console.warn('[AUTH] credentials authorize start', { email })
        const users = await getUser(email)

        if (users.length === 0) {
          console.warn('[AUTH] user not found')
          await compare(password, DUMMY_PASSWORD)
          return null
        }

        const [dbUser] = users

        if (!dbUser.password) {
          console.warn('[AUTH] user has no password stored')
          await compare(password, DUMMY_PASSWORD)
          return null
        }

        const passwordsMatch = await compare(password, dbUser.password)
        if (!passwordsMatch) {
          console.warn('[AUTH] password mismatch')
          return null
        }

        console.warn('[AUTH] credentials authorize success', { id: dbUser.id })
        return { ...dbUser, type: 'regular' as const }
      },
    }),

    // Guest sign-in (no credentials)
    Credentials({
      id: 'guest',
      name: 'Guest',
      credentials: {},
      async authorize() {
        console.warn('[AUTH] guest authorize start')
        const [guestUser] = await createGuestUser()
        console.warn('[AUTH] guest created', { id: guestUser.id, email: guestUser.email })
        return { ...guestUser, type: 'guest' as const }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        console.warn('[AUTH] jwt callback set token', { userId: user.id })
        token.id = (user.id as string) || `u_${generateUUID()}`
        token.type = (user as any).type as UserType
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.type = token.type as UserType
        console.warn('[AUTH] session established', { id: session.user.id, type: session.user.type })
      }
      return session
    },
  },
})
