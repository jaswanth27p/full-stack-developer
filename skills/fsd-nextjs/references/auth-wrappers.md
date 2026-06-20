# Auth Wrapper Patterns (Next.js + Clerk)

## The Core Rule

**Every server action and route handler that reads or writes user-specific data must authenticate first.** No exceptions. The auth check is the first line of code, not an afterthought.

## Server Actions

### Protect all mutations

```typescript
'use server'
import { auth } from '@clerk/nextjs/server'

// Mutation — requires auth
export async function deletePost(postId: string) {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')
  
  // Also verify ownership — user can only delete their own posts
  const post = await prisma.post.findUnique({ where: { id: postId } })
  if (!post) throw new Error('Not found')
  if (post.authorId !== userId) throw new Error('Forbidden')
  
  return prisma.post.delete({ where: { id: postId } })
}
```

### Protect reads of private data

```typescript
'use server'
export async function getMyPosts() {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')
  
  return prisma.post.findMany({ where: { authorId: userId } })
}

// Public reads don't need auth — but be explicit about it:
export async function getPublishedPosts() {
  // No auth needed — this is intentionally public
  return prisma.post.findMany({ where: { published: true } })
}
```

## Route Handlers

```typescript
// app/api/posts/[id]/route.ts
import { auth } from '@clerk/nextjs/server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const post = await prisma.post.findUnique({ where: { id: params.id } })
  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (post.authorId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  await prisma.post.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
```

## Server Component Auth

```typescript
// Check auth in server components for conditional rendering
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')
  
  const user = await currentUser()
  return <Dashboard user={user} />
}
```

## Client Component Auth

```typescript
'use client'
import { useAuth, useUser } from '@clerk/nextjs'

export function ProfileButton() {
  const { isSignedIn, userId } = useAuth()
  const { user } = useUser()
  
  if (!isSignedIn) return <SignInButton />
  return <UserButton afterSignOutUrl="/" />
}
```

## User Sync (Clerk → DB)

When you need app-specific user data (profile, settings, subscription), sync Clerk user to your DB:

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'

export async function POST(req: Request) {
  const body = await req.text()
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')
  
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
  const evt = wh.verify(body, { 'svix-id': svix_id!, 'svix-timestamp': svix_timestamp!, 'svix-signature': svix_signature! })
  
  if (evt.type === 'user.created') {
    await prisma.user.create({
      data: {
        clerkId: evt.data.id,
        email: evt.data.email_addresses[0].email_address,
        name: `${evt.data.first_name} ${evt.data.last_name}`,
      },
    })
  }
  
  return new Response('OK', { status: 200 })
}
```

Prisma model must have `clerkId String @unique` on the User model.
