import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

import { signIn } from '@/app/(auth)/auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const redirectUrl = searchParams.get('redirectUrl') || '/'

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  })

  if (token) {
    console.warn('[AUTH] guest route: already signed in', { id: (token as any).id })
    return NextResponse.redirect(new URL('/', request.url))
  }

  console.warn('[AUTH] guest route: signing in as guest', { redirectUrl })
  return signIn('guest', { redirect: true, redirectTo: redirectUrl })
}
