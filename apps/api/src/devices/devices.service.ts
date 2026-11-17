import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  DeviceListQuery,
  NetworkDeviceWithPorts,
  OfflineDevicesSummary,
  PurgeOfflineDevicesResult,
} from '@physnet/shared';
import { SystemEventsService } from '../events/system-events.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateDeviceDto } from './dto/update-device.dto.js';

const withPorts = { ports: { orderBy: { portNumber: 'asc' as const } } };

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: SystemEventsService,
  ) {}

  findAll(query: DeviceListQuery): Promise<NetworkDeviceWithPorts[]> {
    const search = query.search?.trim();
    return this.prisma.networkDevice.findMany({
      where: {
        ...(query.type && { deviceType: query.type }),
        ...(query.status && { status: query.status }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { onosDeviceId: { contains: search, mode: 'insensitive' } },
            { macAddress: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: withPorts,
      orderBy: [{ deviceType: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string): Promise<NetworkDeviceWithPorts> {
    const device = await this.prisma.networkDevice.findUnique({
      where: { id },
      include: withPorts,
    });
    if (!device) throw new NotFoundException(`Device ${id} not found`);
    return device;
  }

  async update(
    id: string,
    dto: UpdateDeviceDto,
  ): Promise<NetworkDeviceWithPorts> {
    await this.findOne(id);
    return this.prisma.networkDevice.update({
      where: { id },
      data: dto,
      include: withPorts,
    });
  }

  async offlineSummary(): Promise<OfflineDevicesSummary> {
    const [total, placed] = await Promise.all([
      this.prisma.networkDevice.count({ where: { status: 'OFFLINE' } }),
      this.prisma.networkDevice.count({
        where: { status: 'OFFLINE', spatialCoordinates: { some: {} } },
      }),
    ]);
    return { total, placed };
  }

  async purgeOffline(
    includePlaced = false,
  ): Promise<PurgeOfflineDevicesResult> {
    const victims = await this.prisma.networkDevice.findMany({
      where: {
        status: 'OFFLINE',
        ...(!includePlaced && { spatialCoordinates: { none: {} } }),
      },
      select: {
        id: true,
        spatialCoordinates: { select: { floorPlanId: true } },
      },
    });
    // Re-check the status: a device may have come back since the read.
    const { count: deleted } = await this.prisma.networkDevice.deleteMany({
      where: { id: { in: victims.map((v) => v.id) }, status: 'OFFLINE' },
    });
    const keptPlaced = includePlaced
      ? 0
      : await this.prisma.networkDevice.count({ where: { status: 'OFFLINE' } });

    if (deleted > 0) {
      this.events.publish({
        type: 'device.removed',
        severity: 'info',
        message: `Видалено неактивних пристроїв: ${deleted}`,
        floorPlanIds: [
          ...new Set(
            victims.flatMap((v) =>
              v.spatialCoordinates.map((c) => c.floorPlanId),
            ),
          ),
        ],
        data: { deviceIds: victims.map((v) => v.id) },
      });
    }
    return { deleted, keptPlaced };
  }

  async remove(id: string): Promise<void> {
    const device = await this.prisma.networkDevice.findUnique({
      where: { id },
      select: {
        name: true,
        status: true,
        spatialCoordinates: { select: { floorPlanId: true } },
      },
    });
    if (!device) throw new NotFoundException(`Device ${id} not found`);
    if (device.status !== 'OFFLINE') {
      throw new ConflictException(
        'Only OFFLINE devices can be deleted: ONOS still reports this one',
      );
    }
    await this.prisma.networkDevice.delete({ where: { id } });
    this.events.publish({
      type: 'device.removed',
      severity: 'info',
      message: `Пристрій ${device.name} видалено`,
      deviceId: id,
      floorPlanIds: device.spatialCoordinates.map((c) => c.floorPlanId),
    });
  }
}
