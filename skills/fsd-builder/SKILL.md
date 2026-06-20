---
name: fsd-builder
description: >
  Opinionated full-stack implementation skill. Builds features end-to-end with no gaps:
  data layer → API/server actions → UI → auth → error/loading states. Enforces the
  chosen tech stack rules (Next.js, NestJS, Turborepo, Expo, Mastra) and spawns
  sub-agents to validate builds, check rule compliance, and verify completeness.
  Use this skill whenever implementing features, building a project, continuing development,
  or adding functionality. Triggers on: "implement X", "build X", "add X feature",
  "continue building", "create X", "wire up X", "make X work end to end".
  Always invoke fsd-architect first if the stack hasn't been decided yet.
---

# FSD Builder

Build features fully, correctly, and following the opinionated stack rules. Every feature goes from DB schema to working UI with no gaps.

## Before Starting

1. **Confirm the stack** — check if fsd-architect has already decided the stack. If not, invoke it first.
2. **Load the relevant tech rules** — based on the stack, read the appropriate skill files:
   - Next.js in use → read `../fsd-nextjs/references/rules.md`
   - NestJS in use → read `../fsd-nestjs/references/rules.md` and `../fsd-nestjs/references/module-structure.md`
   - Turborepo → read `../fsd-turborepo/references/rules.md`
   - Expo → read `../fsd-expo/references/rules.md`
   - Mastra → read `../fsd-mastra/references/patterns.md`
   - Always → read `../../references/prisma-rules.md`
3. **Read the implementation checklist** — `references/implementation-checklist.md`

## Implementation Approach

### Think before coding

Before writing any code, briefly outline:
- What entities/models are involved
- What CRUD operations this feature needs
- What UI flows the user needs
- What auth boundaries exist

This prevents half-implementation. If you can't outline the full flow, the feature spec is incomplete — clarify before building.

### Build in this order (always)

1. **Schema** — add/update Prisma models, run migration
2. **Data layer** — server actions (Next.js) or service+controller (NestJS)
3. **Types** — TypeScript interfaces + Zod schemas
4. **UI components** — with real data, not placeholders
5. **Auth wiring** — protect all mutations and sensitive reads
6. **Error & loading states** — every async operation
7. **Edge cases** — empty states, validation errors, 404s

### Never skip ahead

Don't build the UI before the API is working. Don't build the API before the schema is right. Each layer depends on the previous being correct.

## Sub-Agents to Spawn

Use the Agent tool to spawn these at the right times. They prevent drift and catch issues early.

### After each major feature is implemented:
Spawn **completeness-checker** (`agents/completeness-checker.md`):
```
Check completeness of [feature name] implementation.
Stack: [Next.js / NestJS / etc.]
Files modified: [list the main files]
Verify: CRUD coverage, auth on mutations, UI loading/error states, form wiring.
```

### After every 2-3 features or before claiming a phase is done:
Spawn **build-validator** (`agents/build-validator.md`):
```
Validate build for [Next.js app / NestJS API / Expo app] at [path].
Run type check and build. Report all errors with file:line.
```

### Before finishing any implementation session:
Spawn **stack-compliance** (`agents/stack-compliance.md`):
```
Check stack rule compliance for files modified in this session: [file list].
Stack rules: [Next.js / NestJS / etc.] rules from fsd-[tech]/references/rules.md.
Report violations.
```

## Quality Gates

Don't move on from a feature until:
- Zero TypeScript errors in the modified files
- All CRUD operations exist and are wired end-to-end
- Auth is checked on every mutation
- Loading and error states exist in the UI
- You could demo the feature from scratch and it works

## Referencing Docs

When unsure about specific API or pattern, fetch the relevant doc:
- See `../../references/docs-urls.md` for all URLs
- Use llms.txt versions for quick reference
- Use full docs for edge cases and migration guides

## Related Skills

**Planning (invoke before implementation):**
- `fsd-architect` — stack selection if not yet decided
- `superpowers:brainstorming` — if feature scope is unclear
- `superpowers:writing-plans` — phased implementation plan
- `superpowers:using-git-worktrees` — isolate implementation in a git worktree

**Tech rules (load based on your stack):**
- `fsd-nextjs` — Next.js App Router, TanStack Query, shadcn, Clerk auth patterns
- `fsd-nestjs` — NestJS module structure, DTOs, guards, Prisma service
- `fsd-turborepo` — monorepo structure, workspace packages, build pipeline
- `fsd-expo` — Expo Router, NativeWind, Clerk Expo, TanStack Query for mobile
- `fsd-mastra` — agentic features, tool definitions, workflow orchestration

**UI/Design (invoke alongside fsd-nextjs or fsd-expo):**
- `ui-ux-pro-max` — high-end UI design, typography, color, component aesthetics
- `shadcn` — shadcn/ui component search, installation, and customization

**Quality (invoke after each feature or phase):**
- `superpowers:test-driven-development` — write tests before/alongside implementation
- `superpowers:requesting-code-review` — structured code review pass
- `superpowers:verification-before-completion` — verify everything works before claiming done
- `superpowers:systematic-debugging` — when something is broken and the cause is unclear

## Handing Off

After implementing a set of features, tell the user:
- What was built (brief feature list)
- What sub-agent checks were run and results
- What's next (suggest using `superpowers:requesting-code-review` for a review pass)
