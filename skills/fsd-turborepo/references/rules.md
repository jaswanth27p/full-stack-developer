# Turborepo Monorepo Rules

## Root package.json

```json
{
  "name": "repo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "db:migrate": "turbo run db:migrate --filter=@repo/db",
    "db:generate": "turbo run db:generate --filter=@repo/db"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

## turbo.json Pipeline

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {
      "dependsOn": ["^build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

`"dependsOn": ["^build"]` means: build all dependencies first. This enforces `db → types → ui → apps` order automatically.

## Package Structure

### packages/db

```
packages/db/
  prisma/
    schema.prisma   ← SINGLE source of truth for all apps
    migrations/
  src/
    index.ts        ← exports prisma client
  package.json
  tsconfig.json
```

```typescript
// packages/db/src/index.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export * from '@prisma/client'  // re-export all Prisma types
```

```json
// packages/db/package.json
{
  "name": "@repo/db",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev"
  },
  "dependencies": { "@prisma/client": "latest" },
  "devDependencies": { "prisma": "latest" }
}
```

### packages/types

```
packages/types/
  src/
    index.ts        ← re-exports all types
    [feature].ts    ← Zod schemas + inferred types per domain
  package.json
  tsconfig.json
```

```typescript
// packages/types/src/post.ts
import { z } from 'zod'

export const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
})

export type CreatePostInput = z.infer<typeof CreatePostSchema>
export type Post = { id: string; title: string; content: string; authorId: string; createdAt: Date }
```

### packages/ui

```
packages/ui/
  src/
    components/   ← shadcn components copied here
    index.ts      ← re-exports all components
  package.json
  tsconfig.json
  tailwind.config.ts
```

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "exports": { ".": "./src/index.ts" },
  "peerDependencies": { "react": "*", "react-dom": "*" }
}
```

### packages/config

```
packages/config/
  tsconfig/
    base.json       ← base tsconfig
    nextjs.json     ← Next.js extends base
    nestjs.json     ← NestJS extends base
    expo.json       ← Expo extends base
  eslint/
    base.js
    nextjs.js
    nestjs.js
  tailwind/
    base.ts         ← shared tailwind config
```

## Consuming Packages in Apps

```json
// apps/web/package.json
{
  "dependencies": {
    "@repo/ui": "*",
    "@repo/types": "*",
    "@repo/db": "*"
  }
}
```

```typescript
// apps/web/src/app/page.tsx
import { Button } from '@repo/ui'
import type { Post } from '@repo/types'
import { prisma } from '@repo/db'
```

## Environment Variables

- Root `.env` for shared vars (DATABASE_URL)
- App-specific `.env.local` for app-specific vars
- Never commit `.env` files — use `.env.example`
- Turborepo doesn't automatically load env vars — each app handles its own

## Running Specific Apps

```bash
# Run only web
turbo run dev --filter=web

# Run web + its dependencies
turbo run dev --filter=web...

# Run all apps
turbo run dev

# Type check everything
turbo run type-check
```

## Package Boundary Rules

- Apps can import from packages — **never** the reverse
- Packages can import from other packages following the build order (`db` → `types` → `ui`)
- Apps **cannot** import from other apps (circular dependency nightmare)
- If two apps need the same logic: extract to a package
