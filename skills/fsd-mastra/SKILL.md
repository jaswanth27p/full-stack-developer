---
name: fsd-mastra
description: >
  Opinionated Mastra agentic framework rules for building AI-powered features in full-stack
  applications. Covers agent definition, tool creation with typed Zod schemas, workflow
  orchestration, memory patterns, and integration with Next.js route handlers or NestJS
  controllers. Use this skill when adding AI agents, LLM-powered workflows, or agentic
  features to a full-stack project. Triggers on: "AI agent", "agentic", "Mastra",
  "LLM workflow", "AI feature", "tool calling", "agent memory", "AI automation",
  "build an agent", "mastra workflow", or when the project description mentions AI capabilities.
---

# Mastra Opinionated Rules

Read `references/patterns.md` for agent patterns, tool definitions, workflow orchestration, and integration examples.

## Quick Reference

**Always use:**
- `@mastra/core` for agent + tool definitions
- Zod for all tool input/output schemas
- Typed tool definitions (never `any` in schemas)
- Mastra's built-in memory for conversation context
- Environment-based model configuration (never hardcode model names)

**Integration:**
- Next.js: Mastra agents in API route handlers (`app/api/agent/route.ts`)
- NestJS: Mastra in a dedicated `AgentModule` with injectable `AgentService`
- Streaming: Use Mastra's streaming API for chat-like interfaces

## Related Skills

These rules are your source of truth for Mastra agentic patterns. For integration context, invoke:

- `fsd-nextjs` — when embedding Mastra agents in Next.js route handlers (auth wrappers, streaming responses)
- `fsd-nestjs` — when embedding Mastra in a NestJS `AgentModule` (DI patterns, guard integration)
- `claude-api` — when selecting AI models (Claude, GPT-4o), understanding pricing, streaming API, and tool use patterns for the underlying LLM
- `superpowers:systematic-debugging` — when agent tool calls fail or produce unexpected results

## Docs

Use https://mastra.ai/llms.txt first, then https://mastra.ai/docs for detailed patterns.
