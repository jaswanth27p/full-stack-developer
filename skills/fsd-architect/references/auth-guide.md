# Auth Decision Guide

## Default Choice: Clerk

Use Clerk unless there's a specific reason not to. It handles OAuth, MFA, organizations, session management, and has first-class SDKs for Next.js, Expo, and NestJS JWT validation.

**Packages:**
- Web: `@clerk/nextjs`
- Mobile: `@clerk/expo`
- API validation: verify JWT using Clerk's JWKS endpoint in NestJS guard

## When to Use Auth.js (next-auth)

- Open source / no vendor lock-in requirement
- Self-hosted auth needed
- Budget constraint (Clerk is free up to 10k MAU, but orgs cost)
- Custom OAuth providers Clerk doesn't support

**Packages:** `next-auth` + `@auth/prisma-adapter`

## When to Use Custom Auth

- Username + password only, no social auth
- Existing JWT infrastructure to integrate with
- Complete control required

**Stack:** bcrypt + JWT + NestJS Guards + Next.js middleware

---

## Integration Patterns

### Clerk in Next.js

```typescript
// app/layout.tsx — wrap everything
import { ClerkProvider } from '@clerk/nextjs'
export default function RootLayout({ children }) {
  return <ClerkProvider>{children}</ClerkProvider>
}

// middleware.ts — protect routes
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])
export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect()
})
```

### Clerk in Server Actions (always wrap)

```typescript
import { auth } from '@clerk/nextjs/server'

export async function updateProfile(data: UpdateProfileDto) {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')
  return prisma.user.update({ where: { clerkId: userId }, data })
}
```

### Clerk JWT Validation in NestJS

```typescript
// Verify using Clerk's JWKS endpoint
// CLERK_PUBLISHABLE_KEY → extract kid, verify signature
// Use a ClerkGuard that wraps @nestjs/passport JWT strategy
// with jwksUri: `https://<your-clerk-domain>/.well-known/jwks.json`
```

### Clerk in Expo

```typescript
import { ClerkProvider, useAuth } from '@clerk/expo'
// Wrap root layout with ClerkProvider
// Use useAuth() hook for auth state
// Use useSignIn() / useSignUp() for auth flows
```

---

## User Sync Pattern (Clerk → Database)

Clerk stores auth data; your DB stores app data. Sync via webhook:

```typescript
// app/api/webhooks/clerk/route.ts
// Listen for user.created, user.updated events
// Upsert user record in your Prisma DB with clerkId as foreign key
```

Always store `clerkId: String @unique` on your User model.
