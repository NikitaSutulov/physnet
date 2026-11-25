import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { PortsController } from './ports.controller.js';
import { PortsService } from './ports.service.js';

@Module({
  controllers: [DevicesController, PortsController],
  providers: [DevicesService, PortsService],
  exports: [DevicesService],
})
export class DevicesModule {}
