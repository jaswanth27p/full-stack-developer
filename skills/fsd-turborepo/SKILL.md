---
name: fsd-turborepo
description: >
  Opinionated Turborepo monorepo rules for full-stack projects containing multiple apps
  (Next.js web, NestJS API, Expo mobile) with shared packages (UI, types, DB, config).
  Enforces workspace structure, package naming conventions, build pipeline order, and
  single Prisma schema in packages/db. Use this skill when setting up or working in a
  Turborepo monorepo, creating shared packages, configuring turbo.json pipelines, or
  managing workspace dependencies. Also triggers on "monorepo", "workspace", "turbo",
  "shared package", "packages/ui", "packages/types", "packages/db".
---

# Turborepo Opinionated Rules

Read `references/rules.md` for the full monorepo structure and configuration rules.

## Quick Reference

**Standard workspace layout:**
```
apps/
  web/      ← Next.js
  api/      ← NestJS
  mobile/   ← Expo
packages/
  ui/       ← @repo/ui (shared shadcn components)
  types/    ← @repo/types (shared TypeScript types + Zod schemas)
  db/       ← @repo/db (Prisma client + schema)
  config/   ← @repo/config (tsconfig, eslint, tailwind)
```

**Package naming:** Always `@repo/<name>` scope.

**Build order:** `db` → `types` → `ui` → `apps/*`

**Single Prisma schema** in `packages/db/prisma/schema.prisma` — never duplicate.

## Related Skills

These rules are your source of truth for monorepo structure. For deeper patterns, invoke if installed:

- `turborepo` — extended Turborepo guidance: remote caching, CI optimization, affected package filtering, advanced pipeline configuration
- `fsd-nextjs` — Next.js rules for the `apps/web` workspace
- `fsd-nestjs` — NestJS rules for the `apps/api` workspace
- `fsd-expo` — Expo rules for the `apps/mobile` workspace

**Always check** `../../references/prisma-rules.md` — in Turborepo the Prisma schema lives in `packages/db` and is shared across all apps.

## Docs

Use https://turborepo.dev/llms.txt for quick reference.
