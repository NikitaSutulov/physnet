import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type {
  NetworkDeviceWithPorts,
  OfflineDevicesSummary,
  PurgeOfflineDevicesResult,
} from '@physnet/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { DevicesService } from './devices.service.js';
import { ListDevicesQuery } from './dto/list-devices.query.js';
import { PurgeOfflineQuery } from './dto/purge-offline.query.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  findAll(@Query() query: ListDevicesQuery): Promise<NetworkDeviceWithPorts[]> {
    return this.devices.findAll(query);
  }

  @Get('offline/summary')
  offlineSummary(): Promise<OfflineDevicesSummary> {
    return this.devices.offlineSummary();
  }

  @Delete('offline')
  @Roles('ADMIN')
  purgeOffline(
    @Query() query: PurgeOfflineQuery,
  ): Promise<PurgeOfflineDevicesResult> {
    return this.devices.purgeOffline(query.includePlaced);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NetworkDeviceWithPorts> {
    return this.devices.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeviceDto,
  ): Promise<NetworkDeviceWithPorts> {
    return this.devices.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.devices.remove(id);
  }
}
