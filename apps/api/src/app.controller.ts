import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator.js';
import { PrismaService } from './prisma/prisma.service.js';
import { HealthDto } from './common/swagger/health.response.js';

@ApiTags('health')
@Controller('health')
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ type: HealthDto })
  @Get()
  async health(): Promise<{ status: 'ok'; database: 'up' | 'down' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch {
      return { status: 'ok', database: 'down' };
    }
  }
}
