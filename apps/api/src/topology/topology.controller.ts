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
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { PlacedDevice, TopologyResponse } from '@physnet/shared';
import { SocketId } from '../realtime/socket-id.decorator.js';
import { UpdatePositionDto } from './dto/update-position.dto.js';
import { TopologyService } from './topology.service.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import {
  PlacedDeviceDto,
  TopologyResponseDto,
} from '../topology/dto/topology.responses.js';

@ApiTags('topology')
@ApiAuth()
@Controller('floor-plans/:id')
export class TopologyController {
  constructor(private readonly topology: TopologyService) {}

  @ApiOperation({ summary: 'Floor plan with its placed devices and links' })
  @ApiOkResponse({ type: TopologyResponseDto })
  @Get('topology')
  getTopology(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TopologyResponse> {
    return this.topology.getTopology(id);
  }

  @ApiOperation({ summary: 'Place, move or rotate a device on the floor plan' })
  @ApiOkResponse({ type: PlacedDeviceDto })
  @Put('devices/:deviceId/position')
  setPosition(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Body() dto: UpdatePositionDto,
    @SocketId() origin?: string,
  ): Promise<PlacedDevice> {
    return this.topology.setPosition(id, deviceId, dto, origin);
  }

  @ApiOperation({ summary: 'Remove a device from the floor plan' })
  @ApiNoContentResponse()
  @Delete('devices/:deviceId/position')
  @HttpCode(204)
  removePosition(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @SocketId() origin?: string,
  ): Promise<void> {
    return this.topology.removePosition(id, deviceId, origin);
  }
}
