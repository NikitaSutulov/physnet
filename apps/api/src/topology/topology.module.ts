import { Module } from '@nestjs/common';
import { SyncModule } from '../sync/sync.module.js';
import { TopologyController } from './topology.controller.js';
import { TopologyService } from './topology.service.js';

@Module({
  imports: [SyncModule],
  controllers: [TopologyController],
  providers: [TopologyService],
})
export class TopologyModule {}
