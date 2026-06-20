---
name: fsd-nextjs
description: >
  Opinionated Next.js rules and patterns for full-stack development. Enforces App Router,
  TanStack Query for client data fetching, shadcn/ui components, Tailwind CSS, Clerk auth
  with proper server action wrappers, and Prisma in server-only code.
  Use this skill when implementing or reviewing Next.js code in a full-stack project.
  Triggers when working with Next.js App Router, server actions, route handlers, shadcn
  components, or when the fsd-builder skill needs Next.js-specific rules loaded.
  Also triggers when the user asks about Next.js patterns, structure, or conventions.
---

# Next.js Opinionated Rules

Read `references/rules.md` for the full rule set.
Read `references/auth-wrappers.md` for auth pattern examples.

## Quick Reference

**Always use:**
- App Router (never pages directory for new code)
- TanStack Query for client-side data fetching
- shadcn/ui for all base UI components
- Tailwind CSS for all styling (no CSS modules, no styled-components)
- Clerk for auth (`@clerk/nextjs`)
- Prisma in server-only code (server actions, route handlers)
- Zod for all input validation
- TypeScript strict mode

**Never do:**
- `useEffect` + `fetch` for data fetching (use TanStack Query)
- Prisma calls in client components or hooks
- Server actions without auth check
- Route handlers without auth check
- `any` type anywhere
- Hardcoded strings that should be env vars

## Folder Structure

```
src/
  app/
    (auth)/
      sign-in/[[...sign-in]]/page.tsx
      sign-up/[[...sign-up]]/page.tsx
    (protected)/          ← routes requiring auth
      dashboard/
      [feature]/
    api/
      webhooks/           ← Clerk webhook, etc.
  components/
    ui/                   ← shadcn components (never modify directly)
    [feature]/            ← feature-specific components
    shared/               ← shared components (layout, nav, etc.)
  lib/
    db.ts                 ← Prisma singleton
    utils.ts              ← cn() and other utils
  server/
    actions/              ← all server actions (auth-wrapped)
      [feature].ts
  types/
    index.ts              ← shared TypeScript types
  middleware.ts           ← Clerk route protection
```

## Related Skills

These rules are your source of truth for Next.js conventions. For deeper patterns, invoke if installed:

- `ui-ux-pro-max` — high-end visual design, spacing, typography, component aesthetics beyond basic shadcn usage
- `shadcn` — shadcn/ui component search, theming, registry, and advanced customization
- `superpowers:test-driven-development` — write tests for server actions, route handlers, and components

**Always check** `../../references/prisma-rules.md` for Prisma conventions used inside server actions.

## Docs

See `../../references/docs-urls.md` — use https://nextjs.org/docs/llms-full.txt first.
