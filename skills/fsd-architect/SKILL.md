---
name: fsd-architect
description: >
  Opinionated full-stack tech stack selector. Analyzes a project description and
  decides the exact tech stack: Next.js alone, Next.js + NestJS, Turborepo monorepo,
  with or without Expo (mobile), and with or without Mastra (agentic features).
  Always includes Prisma as ORM and Clerk as default auth.
  Use this skill whenever a user describes a new project, asks "what stack should I use",
  "help me build X app", "scaffold X project", "start a new X", or "architect X".
  Also triggers when the user wants to decide between Next.js, NestJS, Turborepo, or Expo
  for a project. Invoke before any planning or implementation begins.
---

# FSD Architect

Determine the right opinionated stack for this project. Don't overcomplicate — pick the simplest stack that fits the requirements and can scale if needed.

## Process

### Step 1: Read the decision guides

Before deciding anything, read both reference files:
- `references/scale-guide.md` — stack profiles and decision tree
- `references/auth-guide.md` — Clerk vs Auth.js vs custom

### Step 2: Ask clarifying questions (if needed)

If the project description doesn't make scale obvious, ask (max 3 questions):
1. Will there be a mobile app now or in the near future?
2. Does the API need to be consumed independently (mobile, third-party)?
3. Are there AI/agent features needed?

Don't ask if the description already answers these.

### Step 3: Emit the stack decision

Output a clear, structured decision:

```
## Stack Decision: [Profile Name]

**Stack:**
- Frontend: Next.js 15 (App Router)
- Backend: [NestJS / Next.js server actions]
- Mobile: [Expo / none]
- Monorepo: [Turborepo / none]
- ORM: Prisma
- Auth: [Clerk / Auth.js / custom]
- UI: shadcn/ui + Tailwind CSS
- Data fetching: TanStack Query
- [Agentic: Mastra / none]

**Why this stack:**
[2-3 sentences explaining the key decision — especially why NestJS vs server actions,
why Turborepo vs not, and any tradeoffs acknowledged]

**Project structure:**
[Show the top-level folder structure for this specific choice]

**Next steps:**
1. Use superpowers:brainstorming to explore the feature set
2. Use superpowers:writing-plans to plan implementation phases
3. Use fsd-system-design to design the DB schema and API contracts
4. Use fsd-builder to implement features end-to-end
```

## Key Principles

**Bias toward simplicity.** A solo developer building a SaaS tool doesn't need Turborepo. Start with what fits now; the structure should support growth but not front-load complexity.

**Turborepo is for when you have 2+ apps or a team.** If the project is web-only and the backend can be server actions, skip NestJS. Add it when the backend needs to be consumed independently.

**Expo always means Turborepo.** If mobile is needed alongside web, the monorepo structure prevents duplication of types, DB client, and config.

**Auth decision is early and sticky.** Clerk is the default. Only deviate if there's a clear reason. Document the reason in the decision output.

**Always include:**
- Prisma (ORM — non-negotiable)
- shadcn/ui + Tailwind (UI — non-negotiable for web)
- TanStack Query (client data fetching — non-negotiable for Next.js client components)
- TypeScript strict mode (non-negotiable)

## Related Skills

**Before building** — invoke these after stack selection:
- `superpowers:brainstorming` — explore feature set and product scope before writing a plan
- `superpowers:writing-plans` — create a phased implementation plan once stack is decided
- `fsd-system-design` — design DB schema, API contracts, and component hierarchy (invoke after planning)

**During implementation** — hand off to:
- `fsd-builder` — main implementation skill that loads tech rules and enforces end-to-end completeness
- `fsd-nextjs` — Next.js rules (triggered automatically by fsd-builder, or invoke directly for questions)
- `fsd-nestjs` — NestJS rules (same)
- `fsd-turborepo` — Turborepo monorepo rules (same)
- `fsd-expo` — Expo mobile rules (same)
- `fsd-mastra` — Mastra agentic rules (if AI features are in scope)

**UI/Design** (invoke alongside fsd-nextjs or fsd-expo for visual work):
- `ui-ux-pro-max` — high-end UI design system, component aesthetics, and UX patterns
- `shadcn` — shadcn/ui component management, installation, and customization

## Docs to consult if needed

See `../../references/docs-urls.md` for all documentation URLs.
When checking Next.js, Turborepo, or Expo specifics: use the llms.txt URLs first.
For NestJS: use https://docs.nestjs.com/ directly.
