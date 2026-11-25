import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SystemEvent } from '@physnet/shared';
import { SystemEventsService } from './system-events.service.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { SystemEventDto } from '../events/system-event.response.js';

@ApiTags('events')
@ApiAuth()
@Controller('events')
export class EventsController {
  constructor(private readonly events: SystemEventsService) {}

  @ApiOperation({ summary: 'Recent system events (newest first)' })
  @ApiOkResponse({ type: [SystemEventDto] })
  @Get()
  recent(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): SystemEvent[] {
    return this.events.recent(Math.min(Math.max(limit, 1), 100));
  }
}
