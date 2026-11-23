import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PlacedDevice, TopologyResponse } from '@physnet/shared';
import { UpdatePositionDto } from './dto/update-position.dto.js';
import { TopologyService } from './topology.service.js';

@ApiTags('topology')
@ApiBearerAuth()
@Controller('floor-plans/:id')
export class TopologyController {
  constructor(private readonly topology: TopologyService) {}

  @Get('topology')
  getTopology(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TopologyResponse> {
    return this.topology.getTopology(id);
  }

  @Put('devices/:deviceId/position')
  setPosition(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Body() dto: UpdatePositionDto,
  ): Promise<PlacedDevice> {
    return this.topology.setPosition(id, deviceId, dto);
  }

  @Delete('devices/:deviceId/position')
  @HttpCode(204)
  removePosition(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ): Promise<void> {
    return this.topology.removePosition(id, deviceId);
  }
}
