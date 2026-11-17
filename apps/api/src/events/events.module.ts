import { Global, Module } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { SystemEventsService } from './system-events.service.js';

@Global()
@Module({
  controllers: [EventsController],
  providers: [SystemEventsService],
  exports: [SystemEventsService],
})
export class EventsModule {}
