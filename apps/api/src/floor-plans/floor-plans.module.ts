import { Module } from '@nestjs/common';
import {
  BuildingsController,
  FloorPlansController,
} from './floor-plans.controller.js';
import { FloorPlansService } from './floor-plans.service.js';

@Module({
  controllers: [FloorPlansController, BuildingsController],
  providers: [FloorPlansService],
  exports: [FloorPlansService],
})
export class FloorPlansModule {}
