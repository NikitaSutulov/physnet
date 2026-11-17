import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller.js';
import { TopologySyncService } from './topology-sync.service.js';

@Module({
  controllers: [SyncController],
  providers: [TopologySyncService],
  exports: [TopologySyncService],
})
export class SyncModule {}
