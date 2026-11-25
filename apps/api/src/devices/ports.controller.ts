import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DevicePort } from '@physnet/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UpdatePortDto } from './dto/update-port.dto.js';
import { PortsService } from './ports.service.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { DevicePortDto } from '../devices/dto/device.responses.js';

@ApiTags('devices')
@ApiAuth()
@Controller('ports')
export class PortsController {
  constructor(private readonly ports: PortsService) {}

  @ApiOperation({ summary: 'Enable or disable a switch port through ONOS' })
  @ApiOkResponse({ type: DevicePortDto })
  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePortDto,
  ): Promise<DevicePort> {
    return this.ports.setEnabled(id, dto.isEnabled);
  }
}
