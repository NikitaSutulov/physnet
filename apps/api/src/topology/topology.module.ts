import { Module } from '@nestjs/common';
import { SyncModule } from '../sync/sync.module.js';
import { LinksController } from './links.controller.js';
import { LinksService } from './links.service.js';
import { TopologyController } from './topology.controller.js';
import { TopologyService } from './topology.service.js';

@Module({
  imports: [SyncModule],
  controllers: [TopologyController, LinksController],
  providers: [TopologyService, LinksService],
})
export class TopologyModule {}
