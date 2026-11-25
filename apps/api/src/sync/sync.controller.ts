import {
  Controller,
  ConflictException,
  Get,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SyncStatus, SyncSummary } from '@physnet/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { TopologySyncService } from './topology-sync.service.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { SyncStatusDto, SyncSummaryDto } from '../sync/sync.responses.js';

@ApiTags('sync')
@ApiAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: TopologySyncService) {}

  @ApiOperation({ summary: 'State of the ONOS synchronisation' })
  @ApiOkResponse({ type: SyncStatusDto })
  @Get('status')
  status(): SyncStatus {
    return this.sync.getStatus();
  }

  @ApiOperation({ summary: 'Synchronise with ONOS now' })
  @ApiOkResponse({ type: SyncSummaryDto })
  @Post()
  @Roles('ADMIN')
  @HttpCode(200)
  async run(): Promise<SyncSummary> {
    if (this.sync.getStatus().running) {
      throw new ConflictException('Synchronisation is already running');
    }
    return this.sync.sync();
  }
}
