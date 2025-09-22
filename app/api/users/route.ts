import { NextResponse } from 'next/server'
import { auth } from '@/app/(auth)/auth'
import { createUser, getUser, getUserById, updateUser } from '@/lib/db/queries'
import type { UserUpdate } from '@/lib/db/schema'

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const id = searchParams.get('id')

  if (email) {
    console.warn('[API] /api/users GET by email', { email })
    const users = await getUser(email)
    return NextResponse.json(users)
  }
  if (id) {
    console.warn('[API] /api/users GET by id', { id })
    const user = await getUserById(id)
    return NextResponse.json(user)
  }
  return new Response('Missing email or id', { status: 400 })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const { email, password } = await request.json()
  if (!email || !password) return new Response('Missing email/password', { status: 400 })
  console.warn('[API] /api/users POST create', { email })
  await createUser(email, password)
  return new Response(null, { status: 201 })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const { id, ...rest } = await request.json()
  if (!id) return new Response('Missing id', { status: 400 })
  const updates = rest as UserUpdate
  console.warn('[API] /api/users PUT update', { id, fields: Object.keys(updates) })
  const result = await updateUser(id, updates)
  return NextResponse.json(result)
}
