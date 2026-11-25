import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DevicePort } from '@physnet/shared';
import { SystemEventsService } from '../events/system-events.service.js';
import { OnosService } from '../onos/onos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PortsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly onos: OnosService,
    private readonly events: SystemEventsService,
  ) {}

  async setEnabled(id: string, isEnabled: boolean): Promise<DevicePort> {
    const port = await this.prisma.devicePort.findUnique({
      where: { id },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            onosDeviceId: true,
            deviceType: true,
            spatialCoordinates: { select: { floorPlanId: true } },
          },
        },
      },
    });
    if (!port) throw new NotFoundException(`Port ${id} not found`);
    const { device, ...rest } = port;
    if (device.deviceType === 'HOST') {
      throw new BadRequestException('Host interfaces are not managed by ONOS');
    }
    if (rest.isEnabled === isEnabled) return rest;

    await this.onos.setPortState(
      device.onosDeviceId,
      rest.portNumber,
      isEnabled,
    );
    const updated = await this.prisma.devicePort.update({
      where: { id },
      data: { isEnabled },
    });
    this.events.publish({
      type: 'port.status',
      severity: isEnabled ? 'info' : 'warning',
      message: `${device.name}, порт ${rest.portNumber}: ${isEnabled ? 'увімкнено' : 'вимкнено'} адміністратором`,
      deviceId: device.id,
      portId: id,
      floorPlanIds: device.spatialCoordinates.map((c) => c.floorPlanId),
      data: { portNumber: rest.portNumber, isEnabled },
    });
    return updated;
  }
}
