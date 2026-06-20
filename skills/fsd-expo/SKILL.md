---
name: fsd-expo
description: >
  Opinionated Expo mobile app rules for full-stack projects. Enforces Expo Router for
  navigation, NativeWind for Tailwind-style mobile styling, Clerk Expo for auth, TanStack
  Query for API data fetching, and shared types from the Turborepo packages/types package.
  Use this skill when building or reviewing Expo mobile app code, setting up navigation,
  implementing mobile auth flows, or connecting the mobile app to the NestJS API.
  Also triggers on "Expo Router", "React Native", "mobile app", "NativeWind",
  "@clerk/expo", "Expo SDK", or when fsd-builder needs Expo-specific rules.
---

# Expo Opinionated Rules

Read `references/rules.md` for the full Expo rule set.

## Quick Reference

**Always use:**
- Expo Router (file-based, same mental model as Next.js App Router)
- NativeWind for styling (Tailwind in React Native)
- `@clerk/expo` for auth
- TanStack Query for API calls
- Shared types from `@repo/types` (in Turborepo)
- TypeScript strict mode

**Navigation groups:**
```
app/
  (auth)/       ← unauthenticated screens
    sign-in.tsx
    sign-up.tsx
  (tabs)/       ← main tab navigator
    index.tsx
    profile.tsx
  _layout.tsx   ← root layout (ClerkProvider)
```

## Related Skills

These rules are your source of truth for Expo conventions. For deeper patterns, invoke if installed:

- `ui-ux-pro-max` — mobile UX patterns, gesture design, native feel guidelines beyond NativeWind basics
- `superpowers:test-driven-development` — write tests for Expo components and hooks
- `fsd-turborepo` — monorepo rules when Expo is inside a Turborepo workspace (always check when in Turborepo)
- `fsd-nestjs` — API rules for the NestJS backend this Expo app consumes

## Docs

- https://docs.expo.dev/llms.txt (quick reference)
- https://docs.expo.dev/versions/v54.0.0 (versioned, use for specific SDK features)
