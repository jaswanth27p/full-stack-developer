# NestJS Opinionated Rules

## Main.ts Setup (always configure these)

```typescript
// main.ts
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  
  // Global validation pipe — applies class-validator to all DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,       // strip unknown properties
    forbidNonWhitelisted: true,
    transform: true,       // transform plain objects to class instances
  }))
  
  // CORS — configure properly for production
  app.enableCors({ origin: process.env.FRONTEND_URL })
  
  // Swagger
  const config = new DocumentBuilder()
    .setTitle('API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config))
  
  await app.listen(process.env.PORT ?? 3001)
}
bootstrap()
```

## PrismaService

```typescript
// prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect()
  }
}

// prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common'
@Global()  // Make it globally available — no need to import in every module
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

## DTO Rules

Every endpoint input = a DTO class with class-validator decorators:

```typescript
// dto/create-post.dto.ts
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsEnum } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePostDto {
  @ApiProperty({ description: 'Post title', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string

  @ApiProperty({ description: 'Post content' })
  @IsString()
  @IsNotEmpty()
  content: string

  @ApiPropertyOptional({ enum: PostStatus })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus
}

// UpdatePostDto — extend with PartialType for PATCH
import { PartialType } from '@nestjs/swagger'
export class UpdatePostDto extends PartialType(CreatePostDto) {}
```

## Guards

### Clerk JWT Guard (when using Clerk)

```typescript
// auth/clerk.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { ClerkClient } from '@clerk/clerk-sdk-node'

@Injectable()
export class ClerkGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = request.headers.authorization?.replace('Bearer ', '')
    if (!token) throw new UnauthorizedException()
    
    try {
      const payload = await clerkClient.verifyToken(token)
      request.userId = payload.sub
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }
}
```

### Apply guard globally, exempt public routes with decorator

```typescript
// main.ts — apply globally
app.useGlobalGuards(new ClerkGuard())

// Decorator for public routes
// auth/public.decorator.ts
import { SetMetadata } from '@nestjs/common'
export const Public = () => SetMetadata('isPublic', true)

// Guard checks for public metadata and skips if present
```

## Controller Rules

```typescript
// posts/posts.controller.ts
@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a post' })
  @ApiResponse({ status: 201, description: 'Post created', type: PostEntity })
  create(@Body() dto: CreatePostDto, @CurrentUser() userId: string) {
    return this.postsService.create(dto, userId)
  }

  @Get()
  @ApiOperation({ summary: 'Get all posts for current user' })
  findAll(@CurrentUser() userId: string) {
    return this.postsService.findAll(userId)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.postsService.findOne(id, userId)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePostDto, @CurrentUser() userId: string) {
    return this.postsService.update(id, dto, userId)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.postsService.remove(id, userId)
  }
}
```

## Service Rules

Business logic only here. Services:
- Call Prisma directly (never through a repository abstraction unless truly needed)
- Throw NestJS exceptions (`NotFoundException`, `ForbiddenException`, etc.)
- Verify ownership before mutations
- Never return raw Prisma models if sensitive fields exist — map to safe types

```typescript
// posts/posts.service.ts
@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePostDto, userId: string) {
    return this.prisma.post.create({ data: { ...dto, authorId: userId } })
  }

  async findOne(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } })
    if (!post) throw new NotFoundException(`Post ${id} not found`)
    if (post.authorId !== userId) throw new ForbiddenException()
    return post
  }

  async update(id: string, dto: UpdatePostDto, userId: string) {
    await this.findOne(id, userId)  // verifies existence + ownership
    return this.prisma.post.update({ where: { id }, data: dto })
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId)  // verifies existence + ownership
    return this.prisma.post.delete({ where: { id } })
  }
}
```

## Global Exception Filter

```typescript
// common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR
    
    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error'
    
    response.status(status).json({ statusCode: status, message, timestamp: new Date().toISOString() })
  }
}
// Register in main.ts: app.useGlobalFilters(new AllExceptionsFilter())
```

## @CurrentUser Decorator

```typescript
// common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest()
    return request.userId  // set by ClerkGuard
  }
)
```
