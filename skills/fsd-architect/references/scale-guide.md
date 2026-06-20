# Stack Scale Guide

## Decision Tree

### Q1: Is there a mobile app?
**Yes** → Expo required. If web also exists → Turborepo.

### Q2: Does the backend need to be consumed independently (mobile app, third-party, public API)?
**Yes** → NestJS for the API layer.

### Q3: How complex is the business logic?
- **Simple CRUD, < 5 entities, single concern** → Next.js alone (server actions + Prisma)
- **Moderate (5–15 entities, some business rules)** → Next.js + NestJS
- **Complex (15+ entities, complex workflows, team scale)** → Turborepo

### Q4: Are there AI/agentic features?
**Yes** → Add Mastra to whichever stack is chosen.

---

## Stack Profiles

### Profile A — Next.js Standalone
**When**: Simple SaaS, internal tool, landing page + dashboard, blog with CMS, < 5 main entities.

```
apps/web (Next.js)
  └── Prisma directly in server actions
  └── Clerk for auth
```

### Profile B — Next.js + NestJS
**When**: API needs to be consumed independently, complex backend logic, mobile planned but not yet built.

```
apps/web  (Next.js)
apps/api  (NestJS)
```
Use Turborepo to manage both.

### Profile C — Full Turborepo Monorepo
**When**: 2+ apps, shared types/UI/db needed, team-scale project.

```
apps/web    (Next.js)
apps/api    (NestJS)
apps/mobile (Expo)
packages/
  ui/       shared shadcn components
  types/    shared TypeScript types + Zod schemas
  db/       Prisma client + schema
  config/   tsconfig, eslint, tailwind config
```

### Profile D — Any + Mastra
**When**: AI agents, workflows, LLM-powered features needed.
Add Mastra to any profile above. In Next.js: route handlers. In NestJS: dedicated module.

---

## Common Project → Stack Mapping

| Project type | Stack |
|-------------|-------|
| SaaS dashboard | Profile C (or B if no mobile) |
| Landing page + auth | Profile A |
| Mobile app only | Expo + NestJS API |
| Marketplace | Profile C |
| Internal tool | Profile A |
| AI-powered app | Profile A or B + Mastra |
| Dev tool / CLI + web | Profile A |
| E-commerce | Profile C |

---

## Questions to Ask When Unclear

If the project description doesn't make the scale obvious, ask:

1. Will there be a mobile app now or in the near future?
2. Does the API need to be consumed by anything other than the web frontend?
3. Roughly how many database entities/models do you expect?
4. Will this be built by multiple developers, or solo?
5. Are there AI/agent features needed?
