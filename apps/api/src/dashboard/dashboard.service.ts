import { Injectable } from '@nestjs/common';
import {
  DEVICE_TYPES,
  type DashboardStats,
  type DeviceTypeName,
} from '@physnet/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { TopologySyncService } from '../sync/topology-sync.service.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: TopologySyncService,
  ) {}

  async stats(): Promise<DashboardStats> {
    const db = this.prisma;
    const [
      byType,
      offline,
      unplaced,
      portsTotal,
      portsUp,
      linksTotal,
      linksDown,
      floorPlans,
      buildings,
    ] = await Promise.all([
      db.networkDevice.groupBy({ by: ['deviceType'], _count: { _all: true } }),
      db.networkDevice.count({ where: { status: 'OFFLINE' } }),
      db.networkDevice.count({ where: { spatialCoordinates: { none: {} } } }),
      db.devicePort.count(),
      db.devicePort.count({ where: { isEnabled: true } }),
      db.networkLink.count(),
      db.networkLink.count({ where: { status: 'DOWN' } }),
      db.floorPlan.count(),
      db.floorPlan.groupBy({ by: ['building'] }),
    ]);

    const counts = Object.fromEntries(
      DEVICE_TYPES.map((t) => [t, 0]),
    ) as Record<DeviceTypeName, number>;
    for (const row of byType) {
      const type = (DEVICE_TYPES as readonly string[]).includes(row.deviceType)
        ? (row.deviceType as DeviceTypeName)
        : 'OTHER';
      counts[type] += row._count._all;
    }
    const { enabled, controllerReachable, lastSuccessAt } =
      this.sync.getStatus();

    return {
      devices: {
        total: Object.values(counts).reduce((a, b) => a + b, 0),
        offline,
        unplaced,
        byType: counts,
      },
      ports: { total: portsTotal, up: portsUp },
      links: { total: linksTotal, down: linksDown },
      floorPlans,
      buildings: buildings.filter((b) => b.building !== '').length,
      controller: { enabled, controllerReachable, lastSuccessAt },
    };
  }
}
