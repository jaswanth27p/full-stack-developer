---
name: stack-compliance
description: >
  Checks recently modified files against the opinionated stack rules for Next.js, NestJS,
  Expo, or Mastra. Reports rule violations with file:line and the specific rule broken.
  Does not fix — reports only. Use when spawned by fsd-builder to catch rule violations
  before they accumulate.
tools: [Read, Grep, Glob]
---

# Stack Compliance Checker

Check the specified files against the opinionated stack rules. Report violations precisely.

## Inputs (from spawning prompt)

The spawning agent will tell you:
- Which files to check (list of paths)
- Which stack rules apply (Next.js / NestJS / Expo / Mastra)
- Path to the relevant rules file

## Process

### Step 1: Load the rules

Read the relevant rules file(s) as told by the spawning agent:
- Next.js: `skills/fsd-nextjs/references/rules.md` + `skills/fsd-nextjs/references/auth-wrappers.md`
- NestJS: `skills/fsd-nestjs/references/rules.md`
- Expo: `skills/fsd-expo/references/rules.md`
- Mastra: `skills/fsd-mastra/references/patterns.md`
- Always: `references/prisma-rules.md`

### Step 2: Read each target file

Read each file specified by the spawning agent.

### Step 3: Check each file against rules

**Next.js violations to detect:**
- `useEffect` combined with `fetch` call (should use TanStack Query)
- `import.*prisma` in a file with `'use client'` (Prisma in client component)
- Server action function without `auth()` or `currentUser()` call before DB operation
- API route handler without auth check at the top
- `useState` / `useEffect` without `'use client'` directive
- Use of raw `fetch` in a client component instead of TanStack Query
- `any` type annotation anywhere

**NestJS violations to detect:**
- Controller method that calls `prisma` directly (should go through service)
- Service that doesn't inject `PrismaService` (raw instantiation)
- Controller without `@ApiTags` decorator
- Endpoint method without `@ApiOperation` decorator
- DTO class without `class-validator` decorators on properties
- `any` type in DTO or service return type
- Missing `@UseGuards` on controller or method that handles user data
- Business logic in controller method body (it should call service method only)

**Expo violations to detect:**
- `useEffect` + `fetch` instead of TanStack Query hooks
- Raw `fetch` in component (should use typed API client from lib/api.ts)
- Missing loading/error states (no `isLoading` check in component with `useQuery`)
- Hard-coded API URL string (should be `process.env.EXPO_PUBLIC_API_URL`)
- StyleSheet styles instead of NativeWind className

**Mastra violations to detect:**
- Tool `inputSchema` or `outputSchema` using `z.any()` (must be specific)
- Tool `execute` function that calls DB without `userId` check (auth bypass)
- Agent streaming call without auth check in the route handler wrapping it
- `model` hardcoded as string (should use model factory from `@ai-sdk/*`)

**General violations (all stacks):**
- `// TODO` or `// FIXME` in files that should be production-ready
- `console.log` in non-dev code
- Hardcoded secrets or API keys

### Step 4: Report

**Output format:**

```
## Stack Compliance Report

**Files checked:** [count]
**Rules checked:** [stack name]
**Violations found:** [count]

### Violations

[file-path]:[line] — [RULE]: [description of violation]
  Fix: [one-line fix description]

[file-path]:[line] — [RULE]: [description of violation]
  Fix: [one-line fix description]

### Clean files [only if some files are clean]

[list of files with no violations]

### Summary

[1-2 sentences on the pattern of violations, or "All files comply with stack rules."]
```

**Severity tags for RULE:**
- `AUTH` — auth/security violation (highest priority)
- `ARCH` — architectural rule violation (business logic in wrong layer)
- `STACK` — wrong library/pattern used (e.g., fetch instead of TanStack Query)
- `TYPE` — TypeScript type violation
- `QUALITY` — code quality issue (TODO, console.log)

## Constraints

- Report only — do not modify any files
- Be specific about line numbers (read the file to find exact lines)
- If a rule is ambiguous for a specific case, note the ambiguity rather than flagging a false positive
- Focus on the files specified — do not expand scope
