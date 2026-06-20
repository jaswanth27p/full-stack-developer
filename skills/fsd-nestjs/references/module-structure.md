# NestJS Module Structure

## Per-Feature File Checklist

Every feature needs these files. Generate all of them, not just the service:

```
src/[feature]/
  [feature].module.ts       ← imports + registers controller + service
  [feature].controller.ts   ← HTTP layer, decorators, routing
  [feature].service.ts      ← business logic + Prisma calls
  dto/
    create-[feature].dto.ts ← POST body
    update-[feature].dto.ts ← PATCH body (extends PartialType)
    [feature]-query.dto.ts  ← GET query params (pagination, filters) if needed
```

## Module Template

```typescript
// [feature]/[feature].module.ts
import { Module } from '@nestjs/common'
import { [Feature]Controller } from './[feature].controller'
import { [Feature]Service } from './[feature].service'

@Module({
  controllers: [[Feature]Controller],
  providers: [[Feature]Service],
  exports: [[Feature]Service],  // export if other modules need it
})
export class [Feature]Module {}
```

Register in `AppModule`:
```typescript
@Module({
  imports: [PrismaModule, [Feature]Module, ...],
})
export class AppModule {}
```

## Standard CRUD Controller Pattern

```typescript
@ApiTags('[features]')
@ApiBearerAuth()  // all routes require JWT
@Controller('[features]')
export class [Feature]Controller {
  constructor(private readonly [feature]Service: [Feature]Service) {}

  @Post()
  @ApiOperation({ summary: 'Create [feature]' })
  @ApiCreatedResponse({ type: [Feature]Entity })
  create(@Body() dto: Create[Feature]Dto, @CurrentUser() userId: string) {
    return this.[feature]Service.create(dto, userId)
  }

  @Get()
  @ApiOperation({ summary: 'List [features] for current user' })
  @ApiOkResponse({ type: [[Feature]Entity] })
  findAll(@CurrentUser() userId: string) {
    return this.[feature]Service.findAll(userId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get [feature] by ID' })
  findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.[feature]Service.findOne(id, userId)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update [feature]' })
  update(
    @Param('id') id: string,
    @Body() dto: Update[Feature]Dto,
    @CurrentUser() userId: string,
  ) {
    return this.[feature]Service.update(id, dto, userId)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete [feature]' })
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.[feature]Service.remove(id, userId)
  }
}
```

## Standard CRUD Service Pattern

```typescript
@Injectable()
export class [Feature]Service {
  constructor(private prisma: PrismaService) {}

  create(dto: Create[Feature]Dto, userId: string) {
    return this.prisma.[feature].create({ data: { ...dto, userId } })
  }

  findAll(userId: string) {
    return this.prisma.[feature].findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: string, userId: string) {
    const item = await this.prisma.[feature].findUnique({ where: { id } })
    if (!item || item.deletedAt) throw new NotFoundException()
    if (item.userId !== userId) throw new ForbiddenException()
    return item
  }

  async update(id: string, dto: Update[Feature]Dto, userId: string) {
    await this.findOne(id, userId)  // validates ownership
    return this.prisma.[feature].update({ where: { id }, data: dto })
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId)  // validates ownership
    // Soft delete:
    return this.prisma.[feature].update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    // Hard delete (only if soft delete not applicable):
    // return this.prisma.[feature].delete({ where: { id } })
  }
}
```

## Pagination DTO (for list endpoints with many records)

```typescript
// common/dto/pagination.dto.ts
import { IsOptional, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20
}
```
