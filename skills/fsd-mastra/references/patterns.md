# Mastra Patterns

## Installation

```bash
npm install @mastra/core
# Optional integrations:
npm install @mastra/memory @mastra/rag
```

## Agent Definition

```typescript
// lib/agents/my-agent.ts (Next.js) or src/agents/my-agent.ts (NestJS)
import { Agent } from '@mastra/core/agent'
import { openai } from '@ai-sdk/openai'  // or anthropic, etc.
import { searchTool, createItemTool } from './tools'

export const myAgent = new Agent({
  name: 'MyAgent',
  instructions: `
    You are a helpful assistant that helps users manage their [domain].
    Always confirm before making changes.
    Be concise and specific in your responses.
  `,
  model: openai('gpt-4o'),  // or anthropic('claude-sonnet-4-6')
  tools: {
    search: searchTool,
    createItem: createItemTool,
  },
})
```

## Tool Definition

Every tool must have:
- Typed input schema (Zod)
- Typed output (TypeScript return type)
- Clear description (the LLM uses this to decide when to call it)
- Error handling

```typescript
// lib/agents/tools.ts
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { prisma } from '@/lib/db'

export const searchPostsTool = createTool({
  id: 'search-posts',
  description: 'Search posts by title or content. Use when user asks to find, search, or look up posts.',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
    limit: z.number().optional().default(10).describe('Maximum results to return'),
  }),
  outputSchema: z.object({
    posts: z.array(z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
    })),
    total: z.number(),
  }),
  execute: async ({ context }) => {
    const { query, limit } = context
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
        deletedAt: null,
      },
      take: limit,
      select: { id: true, title: true, content: true },
    })
    return { posts, total: posts.length }
  },
})

export const createPostTool = createTool({
  id: 'create-post',
  description: 'Create a new post. Use when user explicitly asks to create or publish a post.',
  inputSchema: z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1),
  }),
  outputSchema: z.object({
    post: z.object({ id: z.string(), title: z.string() }),
    success: z.boolean(),
  }),
  execute: async ({ context, runtimeContext }) => {
    // runtimeContext carries user-injected values like userId
    const userId = runtimeContext?.get('userId')
    if (!userId) throw new Error('Unauthorized: userId required in runtimeContext')
    
    const post = await prisma.post.create({
      data: { ...context, authorId: userId },
      select: { id: true, title: true },
    })
    return { post, success: true }
  },
})
```

## Workflow Definition

For multi-step processes that must run in sequence:

```typescript
// lib/agents/workflows/content-pipeline.ts
import { Workflow, Step } from '@mastra/core/workflows'
import { z } from 'zod'

export const contentPipelineWorkflow = new Workflow({
  name: 'content-pipeline',
  triggerSchema: z.object({
    topic: z.string(),
    userId: z.string(),
  }),
})
  .step(
    new Step({
      id: 'research',
      execute: async ({ context }) => {
        // Step 1: research the topic
        const research = await researchTopic(context.triggerData.topic)
        return { research }
      },
    })
  )
  .then(
    new Step({
      id: 'draft',
      execute: async ({ context }) => {
        // Step 2: draft content based on research
        const { research } = context.getStepResult('research')
        const draft = await draftContent(research)
        return { draft }
      },
    })
  )
  .then(
    new Step({
      id: 'publish',
      execute: async ({ context }) => {
        const { draft } = context.getStepResult('draft')
        const post = await prisma.post.create({
          data: { title: draft.title, content: draft.content, authorId: context.triggerData.userId },
        })
        return { postId: post.id }
      },
    })
  )
  .commit()
```

## Memory

```typescript
import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { LibSQLStore } from '@mastra/memory/storage'

const memory = new Memory({
  storage: new LibSQLStore({ url: process.env.DATABASE_URL! }),
})

export const chatAgent = new Agent({
  name: 'ChatAgent',
  instructions: 'You are a helpful assistant with memory of past conversations.',
  model: openai('gpt-4o'),
  memory,
})
```

## Integration: Next.js Route Handler

```typescript
// app/api/agent/chat/route.ts
import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { myAgent } from '@/lib/agents/my-agent'

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  const { messages, threadId } = await req.json()
  
  const stream = await myAgent.stream(messages, {
    threadId,
    resourceId: userId,
    runtimeContext: new Map([['userId', userId]]),
  })
  
  return stream.toDataStreamResponse()
}
```

## Integration: NestJS Module

```typescript
// agents/agents.module.ts
import { Module } from '@nestjs/common'
import { AgentsController } from './agents.controller'
import { AgentsService } from './agents.service'

@Module({
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}

// agents/agents.service.ts
@Injectable()
export class AgentsService {
  private agent = new Agent({
    name: 'ApiAgent',
    instructions: '...',
    model: openai('gpt-4o'),
    tools: { ... },
  })

  async chat(messages: CoreMessage[], userId: string) {
    return this.agent.stream(messages, {
      runtimeContext: new Map([['userId', userId]]),
    })
  }
}

// agents/agents.controller.ts
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('chat')
  @Sse()  // Server-Sent Events for streaming
  chat(@Body() body: ChatDto, @CurrentUser() userId: string) {
    return this.agentsService.chat(body.messages, userId)
  }
}
```

## Rules Summary

1. **Tools are the interface** — agents call tools to do real work; keep agent instructions focused on orchestration
2. **Auth in tools** — tools that mutate data must receive userId via runtimeContext and verify it
3. **Zod everywhere** — all tool schemas must be Zod objects (not `any`, not plain TypeScript types)
4. **Single agent file** — define each agent in one file: agent + its tools together
5. **Streaming by default** — use `.stream()` not `.generate()` for user-facing chat interfaces
6. **Workflows for multi-step** — if a process has 3+ sequential steps with data passing, use a Workflow not an agent with many tools
