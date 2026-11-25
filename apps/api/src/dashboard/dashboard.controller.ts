import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DashboardStats } from '@physnet/shared';
import { DashboardService } from './dashboard.service.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { DashboardStatsDto } from '../dashboard/dashboard.responses.js';

@ApiTags('dashboard')
@ApiAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @ApiOperation({
    summary: 'Network statistics and recent events for the dashboard',
  })
  @ApiOkResponse({ type: DashboardStatsDto })
  @Get('stats')
  stats(): Promise<DashboardStats> {
    return this.dashboard.stats();
  }
}
