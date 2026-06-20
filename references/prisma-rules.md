# Prisma Rules (All Stacks)

## Client Singleton

Always use a singleton pattern — never instantiate PrismaClient more than once per process.

```typescript
// lib/db.ts (Next.js) or src/prisma/prisma.service.ts (NestJS)
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['query'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

In NestJS: wrap as injectable `PrismaService extends PrismaClient` instead.

## Schema Location

- **Turborepo**: `packages/db/prisma/schema.prisma` — single source of truth
- **Standalone**: `prisma/schema.prisma` at repo root

## Migrations

```bash
# Development — always use migrate dev (creates migration file)
npx prisma migrate dev --name describe_change

# Production — never use db push
npx prisma migrate deploy

# Never: prisma db push in production (bypasses migration history)
```

## Naming Conventions

- Models: PascalCase singular (`User`, `BlogPost`)
- Fields: camelCase (`createdAt`, `userId`)
- Enums: PascalCase name, SCREAMING_SNAKE values (`Role { ADMIN USER GUEST }`)
- Relations: always define both sides

## Soft Deletes Pattern

```prisma
model User {
  id        String    @id @default(cuid())
  deletedAt DateTime? // null = active, set = soft deleted
  // ...
}
```

Always filter `where: { deletedAt: null }` in queries unless fetching deleted records explicitly.

## Relation Best Practices

- Define both sides of every relation
- Always cascade deletes explicitly (`onDelete: Cascade` or `onDelete: Restrict`)
- Use `@relation(fields: [...], references: [...])` on the owning side

## Where Prisma Can Be Used

- **Next.js**: Server actions, Route handlers, `getServerSideProps`. NEVER in client components.
- **NestJS**: Only in service layer via injected `PrismaService`. Never in controllers.
- **Turborepo**: Import `@repo/db` package which exports `prisma` client — never create separate clients per app.
