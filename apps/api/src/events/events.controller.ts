import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { SystemEvent } from '@physnet/shared';
import { SystemEventsService } from './system-events.service.js';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private readonly events: SystemEventsService) {}

  @Get()
  recent(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): SystemEvent[] {
    return this.events.recent(Math.min(Math.max(limit, 1), 100));
  }
}
