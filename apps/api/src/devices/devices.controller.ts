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
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type {
  NetworkDeviceWithPorts,
  OfflineDevicesSummary,
  PurgeOfflineDevicesResult,
  UnplacedDevice,
} from '@physnet/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { DevicesService } from './devices.service.js';
import { ListDevicesQuery } from './dto/list-devices.query.js';
import { PurgeOfflineQuery } from './dto/purge-offline.query.js';
import { UnplacedDevicesQuery } from './dto/unplaced-devices.query.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import {
  NetworkDeviceDto,
  OfflineDevicesSummaryDto,
  PurgeOfflineDevicesResultDto,
  UnplacedDeviceDto,
} from './dto/device.responses.js';

@ApiTags('devices')
@ApiAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @ApiOperation({
    summary:
      'List network devices with their ports (filters: type, status, search)',
  })
  @ApiOkResponse({ type: [NetworkDeviceDto] })
  @Get()
  findAll(@Query() query: ListDevicesQuery): Promise<NetworkDeviceWithPorts[]> {
    return this.devices.findAll(query);
  }

  @ApiOperation({
    summary:
      'Devices not placed on the given floor plan, with the plans they are on',
  })
  @ApiOkResponse({ type: [UnplacedDeviceDto] })
  @Get('unplaced')
  findUnplaced(
    @Query() query: UnplacedDevicesQuery,
  ): Promise<UnplacedDevice[]> {
    return this.devices.findUnplaced(query.floorPlanId);
  }

  @ApiOperation({
    summary:
      'How many devices are offline, and how many of them are placed on plans',
  })
  @ApiOkResponse({ type: OfflineDevicesSummaryDto })
  @Get('offline/summary')
  offlineSummary(): Promise<OfflineDevicesSummary> {
    return this.devices.offlineSummary();
  }

  @ApiOperation({
    summary:
      'Delete offline devices (by default only those not placed on any plan)',
  })
  @ApiOkResponse({ type: PurgeOfflineDevicesResultDto })
  @Delete('offline')
  @Roles('ADMIN')
  purgeOffline(
    @Query() query: PurgeOfflineQuery,
  ): Promise<PurgeOfflineDevicesResult> {
    return this.devices.purgeOffline(query.includePlaced);
  }

  @ApiOperation({ summary: 'Get a device with its ports' })
  @ApiOkResponse({ type: NetworkDeviceDto })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NetworkDeviceWithPorts> {
    return this.devices.findOne(id);
  }

  @ApiOperation({ summary: 'Rename a device' })
  @ApiOkResponse({ type: NetworkDeviceDto })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeviceDto,
  ): Promise<NetworkDeviceWithPorts> {
    return this.devices.update(id, dto);
  }

  @ApiOperation({
    summary: 'Delete an offline device (409 while it is active)',
  })
  @ApiNoContentResponse()
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.devices.remove(id);
  }
}
