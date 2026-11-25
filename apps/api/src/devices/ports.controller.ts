import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { DevicePort } from '@physnet/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UpdatePortDto } from './dto/update-port.dto.js';
import { PortsService } from './ports.service.js';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('ports')
export class PortsController {
  constructor(private readonly ports: PortsService) {}

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePortDto,
  ): Promise<DevicePort> {
    return this.ports.setEnabled(id, dto.isEnabled);
  }
}
