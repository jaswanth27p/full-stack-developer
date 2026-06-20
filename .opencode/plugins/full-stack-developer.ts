import { readFileSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"

// Path to the plugin repo — adjust if you move this file to ~/.config/opencode/plugins/
const RULES_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)))

function readRule(relativePath: string): string {
  const fullPath = join(RULES_ROOT, relativePath)
  if (!existsSync(fullPath)) return ""
  return readFileSync(fullPath, "utf-8")
}

export const FullStackDeveloperPlugin: Plugin = async ({ $ }) => {
  // Load rule files once at startup
  const rules = {
    nextjs: readRule("skills/fsd-nextjs/references/rules.md"),
    nextjsAuth: readRule("skills/fsd-nextjs/references/auth-wrappers.md"),
    nestjs: readRule("skills/fsd-nestjs/references/rules.md"),
    nestjsModules: readRule("skills/fsd-nestjs/references/module-structure.md"),
    turborepo: readRule("skills/fsd-turborepo/references/rules.md"),
    expo: readRule("skills/fsd-expo/references/rules.md"),
    mastra: readRule("skills/fsd-mastra/references/patterns.md"),
    prisma: readRule("references/prisma-rules.md"),
    scaleGuide: readRule("skills/fsd-architect/references/scale-guide.md"),
    authGuide: readRule("skills/fsd-architect/references/auth-guide.md"),
    implChecklist: readRule("skills/fsd-builder/references/implementation-checklist.md"),
  }

  // Core rules injected into every compaction so they survive long sessions
  const coreRulesContext = `
## Full-Stack Developer Plugin — Active Rules

### Stack Selection
${rules.scaleGuide}

### Auth Decisions
${rules.authGuide}

### Prisma Rules (all stacks)
${rules.prisma}

### Implementation Completeness Rules
${rules.implChecklist}
`.trim()

  return {
    // ─── Inject rules into compaction summary so rules survive context window pressure ───
    "experimental.session.compacting": async (_input, output) => {
      output.context.push(coreRulesContext)
    },

    // ─── Custom Tools ───
    tool: {
      // Stack-specific rules lookup
      fsd_get_rules: tool({
        description:
          "Get the opinionated rules for a specific tech stack. Call when you need the exact rules for Next.js, NestJS, Turborepo, Expo, or Mastra before implementing code.",
        args: {
          stack: tool.schema
            .enum(["nextjs", "nestjs", "turborepo", "expo", "mastra", "prisma", "auth"])
            .describe("Which stack rules to retrieve"),
        },
        async execute({ stack }) {
          const ruleMap: Record<string, string> = {
            nextjs: [rules.nextjs, rules.nextjsAuth].filter(Boolean).join("\n\n---\n\n"),
            nestjs: [rules.nestjs, rules.nestjsModules].filter(Boolean).join("\n\n---\n\n"),
            turborepo: rules.turborepo,
            expo: rules.expo,
            mastra: rules.mastra,
            prisma: rules.prisma,
            auth: rules.authGuide,
          }
          const result = ruleMap[stack]
          if (!result) return `No rules found for stack: ${stack}`
          return result
        },
      }),

      // Build & type check validator
      fsd_validate_build: tool({
        description:
          "Run TypeScript type check (and optionally full build) for a Next.js, NestJS, Expo, or Turborepo project. Use after implementing features to catch type errors before moving on.",
        args: {
          appPath: tool.schema
            .string()
            .describe(
              "Absolute or relative path to the app/package to check (e.g. 'apps/web', 'apps/api', '.')"
            ),
          projectType: tool.schema
            .enum(["nextjs", "nestjs", "expo", "turborepo"])
            .describe("Type of project"),
          fullBuild: tool.schema
            .boolean()
            .optional()
            .describe("Run full build in addition to type check (default: false — type check only)"),
        },
        async execute({ appPath, projectType, fullBuild }, { directory }) {
          const targetPath = resolve(directory, appPath)

          const typeCheckCmd =
            projectType === "turborepo"
              ? `cd "${targetPath}" && npx turbo run type-check 2>&1`
              : `cd "${targetPath}" && npx tsc --noEmit 2>&1`

          const buildCmd: Record<string, string> = {
            nextjs: `cd "${targetPath}" && npx next build 2>&1`,
            nestjs: `cd "${targetPath}" && npx nest build 2>&1`,
            expo: `cd "${targetPath}" && npx expo export 2>&1`,
            turborepo: `cd "${targetPath}" && npx turbo run build 2>&1`,
          }

          let output = ""

          try {
            const typeResult = await $`bash -c ${typeCheckCmd}`.text()
            output += `## Type Check\n\`\`\`\n${typeResult}\n\`\`\`\n`
          } catch (e: any) {
            output += `## Type Check — FAILED\n\`\`\`\n${e.stdout ?? e.message}\n\`\`\`\n`
          }

          if (fullBuild) {
            try {
              const buildResult = await $`bash -c ${buildCmd[projectType]}`.text()
              output += `## Build\n\`\`\`\n${buildResult}\n\`\`\`\n`
            } catch (e: any) {
              output += `## Build — FAILED\n\`\`\`\n${e.stdout ?? e.message}\n\`\`\`\n`
            }
          }

          return output || "No output from commands."
        },
      }),

      // Stack compliance checker
      fsd_check_compliance: tool({
        description:
          "Scan files for stack rule violations — wrong patterns, missing auth guards, Prisma in client components, missing DTO validation, etc. Run on modified files before finishing a feature.",
        args: {
          filePaths: tool.schema
            .array(tool.schema.string())
            .describe("List of file paths to check (relative to project root)"),
          stack: tool.schema
            .enum(["nextjs", "nestjs", "expo", "mastra"])
            .describe("Which stack rules to check against"),
        },
        async execute({ filePaths, stack }, { directory }) {
          const violations: string[] = []

          const patterns: Record<string, Array<{ pattern: string; label: string; severity: string }>> = {
            nextjs: [
              { pattern: "useEffect.*fetch\\|fetch.*useEffect", label: "useEffect + fetch (use TanStack Query instead)", severity: "STACK" },
              { pattern: "use client.*\\|'use client'", label: "check: Prisma import in client component", severity: "ARCH" },
              { pattern: ": any\\b\\|as any\\b", label: "any type used", severity: "TYPE" },
              { pattern: "console\\.log", label: "console.log left in code", severity: "QUALITY" },
              { pattern: "// TODO\\|// FIXME", label: "TODO/FIXME stub", severity: "QUALITY" },
            ],
            nestjs: [
              { pattern: "this\\.prisma\\.", label: "check: Prisma called in controller (should be service)", severity: "ARCH" },
              { pattern: ": any\\b\\|as any\\b", label: "any type in DTO or service", severity: "TYPE" },
              { pattern: "console\\.log", label: "console.log left in code", severity: "QUALITY" },
              { pattern: "// TODO\\|// FIXME", label: "TODO/FIXME stub", severity: "QUALITY" },
            ],
            expo: [
              { pattern: "useEffect.*fetch\\|fetch.*useEffect", label: "useEffect + fetch (use TanStack Query instead)", severity: "STACK" },
              { pattern: "StyleSheet\\.create", label: "StyleSheet.create (use NativeWind className instead)", severity: "STACK" },
              { pattern: "localhost\\|127\\.0\\.0\\.1", label: "hardcoded localhost URL (use EXPO_PUBLIC_API_URL env var)", severity: "QUALITY" },
              { pattern: "// TODO\\|// FIXME", label: "TODO/FIXME stub", severity: "QUALITY" },
            ],
            mastra: [
              { pattern: "z\\.any()", label: "z.any() in tool schema (must be specific Zod type)", severity: "TYPE" },
              { pattern: "// TODO\\|// FIXME", label: "TODO/FIXME stub", severity: "QUALITY" },
            ],
          }

          const checks = patterns[stack] ?? []

          for (const filePath of filePaths) {
            const fullPath = resolve(directory, filePath)
            if (!existsSync(fullPath)) {
              violations.push(`${filePath}: FILE NOT FOUND`)
              continue
            }

            const content = readFileSync(fullPath, "utf-8")
            const lines = content.split("\n")

            for (const { pattern, label, severity } of checks) {
              const regex = new RegExp(pattern, "i")
              lines.forEach((line: string, idx: number) => {
                if (regex.test(line)) {
                  violations.push(`${filePath}:${idx + 1} — [${severity}] ${label}`)
                }
              })
            }
          }

          if (violations.length === 0) {
            return `✓ No violations found in ${filePaths.length} file(s) against ${stack} rules.`
          }

          return `## Stack Compliance Report — ${stack}\n\nViolations: ${violations.length}\n\n${violations.join("\n")}`
        },
      }),

      // Completeness checker
      fsd_check_completeness: tool({
        description:
          "Check if a feature implementation is complete end-to-end: CRUD coverage, auth on mutations, UI loading/error states, forms wired to real handlers. Run after implementing each feature.",
        args: {
          featureName: tool.schema.string().describe("Name of the feature being checked (e.g. 'posts', 'user profile')"),
          filePaths: tool.schema
            .array(tool.schema.string())
            .describe("Files created/modified for this feature"),
          stack: tool.schema.enum(["nextjs", "nestjs", "expo"]).describe("Stack being used"),
        },
        async execute({ featureName, filePaths, stack }, { directory }) {
          const gaps: string[] = []
          const found: string[] = []

          // Read all files into a combined content string for pattern matching
          const fileContents: Record<string, string> = {}
          for (const fp of filePaths) {
            const fullPath = resolve(directory, fp)
            if (existsSync(fullPath)) {
              fileContents[fp] = readFileSync(fullPath, "utf-8")
            }
          }
          const allContent = Object.values(fileContents).join("\n")

          // CRUD coverage checks
          const crudChecks = [
            { pattern: /create|insert|\.create\(|POST/i, label: "CREATE operation" },
            { pattern: /findMany|findAll|getAll|\.list|GET.*\[\]/i, label: "READ (list) operation" },
            { pattern: /findUnique|findOne|getById|GET.*\/:id/i, label: "READ (single) operation" },
            { pattern: /update|\.update\(|PATCH|PUT/i, label: "UPDATE operation" },
            { pattern: /delete|remove|\.delete\(|DELETE/i, label: "DELETE operation" },
          ]

          for (const { pattern, label } of crudChecks) {
            if (pattern.test(allContent)) found.push(label)
            else gaps.push(`MISSING: ${label}`)
          }

          // Auth checks
          if (stack === "nextjs") {
            if (!/auth\(\)|useAuth\(\)|currentUser\(\)/i.test(allContent)) {
              gaps.push("MISSING: Auth check — no auth() / useAuth() / currentUser() found")
            } else {
              found.push("Auth check present")
            }
          }
          if (stack === "nestjs") {
            if (!/@UseGuards|@CurrentUser/i.test(allContent)) {
              gaps.push("MISSING: Auth guard — no @UseGuards or @CurrentUser decorator found")
            } else {
              found.push("Auth guard present")
            }
          }

          // UI state checks (Next.js + Expo)
          if (stack === "nextjs" || stack === "expo") {
            if (!/isLoading|isPending|Skeleton|ActivityIndicator/i.test(allContent)) {
              gaps.push("MISSING: Loading state — no isLoading check or skeleton/spinner found")
            } else {
              found.push("Loading state present")
            }
            if (!/error.*return|isError|catch/i.test(allContent)) {
              gaps.push("MISSING: Error state — no error handling in UI found")
            } else {
              found.push("Error state present")
            }
          }

          // Stub/placeholder checks
          const stubPatterns = [
            { pattern: /\/\/ TODO/i, label: "TODO stub" },
            { pattern: /\/\/ FIXME/i, label: "FIXME stub" },
            { pattern: /dummy|placeholder|lorem ipsum/i, label: "Placeholder/dummy data" },
            { pattern: /onSubmit.*console\.log/i, label: "Form submits to console.log (not wired)" },
          ]
          for (const { pattern, label } of stubPatterns) {
            if (pattern.test(allContent)) gaps.push(`STUB: ${label}`)
          }

          // Result
          const verdict =
            gaps.length === 0
              ? "✓ COMPLETE"
              : gaps.some((g) => g.startsWith("MISSING: Auth") || g.startsWith("MISSING: CREATE") || g.startsWith("MISSING: READ"))
              ? "✗ INCOMPLETE — critical gaps"
              : "⚠ NEEDS POLISH — minor gaps"

          return [
            `## Completeness Report — ${featureName} (${stack})`,
            `**Verdict:** ${verdict}`,
            "",
            found.length > 0 ? `### Found (${found.length})\n${found.map((f) => `- ✓ ${f}`).join("\n")}` : "",
            gaps.length > 0 ? `### Gaps (${gaps.length})\n${gaps.map((g) => `- ✗ ${g}`).join("\n")}` : "### No gaps found",
          ]
            .filter(Boolean)
            .join("\n")
        },
      }),
    },
  }
}
