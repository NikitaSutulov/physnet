import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { TopologyEventsService } from './topology-events.service.js';

@Global()
@Module({
  imports: [AuthModule],
  providers: [RealtimeGateway, TopologyEventsService],
  exports: [TopologyEventsService],
})
export class RealtimeModule {}
