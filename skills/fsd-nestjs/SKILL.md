---
name: fsd-nestjs
description: >
  Opinionated NestJS rules and patterns for full-stack API development. Enforces feature
  module structure, Prisma via injectable PrismaService, DTOs with class-validator,
  JWT/Clerk guards on all protected routes, global exception filters, and Swagger docs.
  Use this skill when implementing or reviewing NestJS code. Triggers when building a
  NestJS API, creating modules/controllers/services/DTOs, setting up guards or interceptors,
  or when fsd-builder needs NestJS-specific rules. Also triggers on "API module", "NestJS
  controller", "NestJS service", "DTO", "guard", "nest scaffold", "nest generate".
---

# NestJS Opinionated Rules

Read `references/rules.md` for the full rule set.
Read `references/module-structure.md` for the exact file structure per feature.

## Quick Reference

**Always use:**
- Feature modules (one module per domain entity)
- Prisma via injectable `PrismaService` (never instantiate directly)
- DTOs with `class-validator` decorators for all input
- Guards (`JwtGuard` or `ClerkGuard`) on all non-public endpoints
- `@ApiTags`, `@ApiOperation`, `@ApiResponse` on all controllers (Swagger)
- Global exception filter for consistent error responses
- Global validation pipe in `main.ts`

**Never do:**
- Business logic in controllers (belongs in services)
- Database calls in controllers (belongs in services)
- `any` type in DTOs or return types
- Unprotected endpoints that touch user data

## Folder Structure

```
src/
  app.module.ts
  main.ts
  common/
    filters/        ← global exception filter
    guards/         ← JwtGuard / ClerkGuard
    interceptors/   ← response transform interceptor
    decorators/     ← @CurrentUser(), @Public()
    dto/            ← shared DTOs (pagination, etc.)
  prisma/
    prisma.module.ts
    prisma.service.ts
  auth/
    auth.module.ts
    auth.guard.ts
    auth.decorator.ts
  [feature]/
    [feature].module.ts
    [feature].controller.ts
    [feature].service.ts
    dto/
      create-[feature].dto.ts
      update-[feature].dto.ts
    entities/       ← optional, if mapping from Prisma types
```

## Related Skills

These rules are your source of truth for NestJS structure. For deeper patterns, invoke if installed:

- `nestjs-best-practices` — extended NestJS architecture guidance, advanced DI patterns, performance, and security hardening beyond these base rules
- `superpowers:test-driven-development` — write unit tests for services and e2e tests for controllers
- `superpowers:systematic-debugging` — when NestJS DI or guard issues are hard to trace

**Always check** `../../references/prisma-rules.md` for Prisma conventions in NestJS services.

## Docs

Use https://docs.nestjs.com/ — NestJS has no llms.txt, use full docs.
