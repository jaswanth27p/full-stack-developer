# Next.js Opinionated Rules

## App Router Rules

- Use `app/` directory exclusively. If you see `pages/`, it's legacy — don't add new code there.
- Server Components are default. Only add `'use client'` when you need interactivity, hooks, or browser APIs.
- Layouts in `layout.tsx`, pages in `page.tsx`, loading in `loading.tsx`, errors in `error.tsx`.
- Route groups with `(name)` for logical organization without affecting URLs.
- Parallel routes `@slot` only for complex dashboard layouts that need simultaneous views.

## Data Fetching Rules

### Server Components — fetch directly

```typescript
// Good — server component, fetch in component body
export default async function UserList() {
  const users = await prisma.user.findMany()
  return <ul>{users.map(u => <UserCard key={u.id} user={u} />)}</ul>
}
```

### Client Components — always TanStack Query

```typescript
// Good — client component with TanStack Query
'use client'
import { useQuery } from '@tanstack/react-query'

export function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
  })
  if (isLoading) return <UserProfileSkeleton />
  if (error) return <ErrorMessage error={error} />
  return <div>{data.name}</div>
}

// Never do this:
// useEffect(() => { fetch('/api/users').then(...) }, [])
```

### TanStack Query Setup

```typescript
// app/providers.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient()
export function Providers({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

Wrap the root layout with `<Providers>` alongside `<ClerkProvider>`.

## Server Actions Rules

Every server action must:
1. Start with auth check
2. Validate input with Zod
3. Return typed result
4. Handle errors gracefully

```typescript
// server/actions/posts.ts
'use server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
})

export async function createPost(input: z.infer<typeof CreatePostSchema>) {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')

  const validated = CreatePostSchema.parse(input)
  
  return prisma.post.create({
    data: { ...validated, authorId: userId },
  })
}
```

## Route Handler Rules

```typescript
// app/api/posts/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await req.json()
  // validate with Zod...
  // return NextResponse.json(result)
}
```

## Component Rules

### Always use shadcn/ui for base components

```typescript
// Good
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

// Never write your own button/input/card from scratch
```

### Always handle loading and error states

```typescript
// Every data-dependent component needs these three states:
if (isLoading) return <ComponentSkeleton />   // Use shadcn Skeleton
if (error) return <ErrorMessage error={error} />
return <ComponentContent data={data} />
```

### Skeleton loaders over spinners

```typescript
// Good — skeleton that matches layout
import { Skeleton } from '@/components/ui/skeleton'
function UserCardSkeleton() {
  return (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  )
}
```

## TypeScript Rules

- `strict: true` in tsconfig — no exceptions
- No `any` — use `unknown` + type narrowing if type is truly unknown
- Zod schemas as the single source of truth for runtime types
- Export inferred types from Zod schemas: `type CreatePost = z.infer<typeof CreatePostSchema>`
- Use `satisfies` operator for config objects

## Middleware (Clerk)

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/settings(.*)',
  '/api/(?!webhooks)(.*)',  // protect API routes except webhooks
])

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect()
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

## Forms

Always use `react-hook-form` + `@hookform/resolvers/zod` + shadcn Form components:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
```

Use `useTransition` + server actions for form submissions, or `useMutation` from TanStack Query for API route-based forms.

## Environment Variables

- Server-only: no `NEXT_PUBLIC_` prefix. Access in server actions, route handlers, lib files.
- Client-accessible: `NEXT_PUBLIC_` prefix. Only for non-sensitive config (Clerk publishable key, etc.).
- Never expose secret keys with `NEXT_PUBLIC_`.

## Error Boundaries

Every route segment that fetches data should have an `error.tsx`:

```typescript
// app/(protected)/dashboard/error.tsx
'use client'
export default function DashboardError({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```
