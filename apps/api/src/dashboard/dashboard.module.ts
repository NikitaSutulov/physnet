import { Module } from '@nestjs/common';
import { SyncModule } from '../sync/sync.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [SyncModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
