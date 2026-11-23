import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PlacedDevice, TopologyResponse } from '@physnet/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { TopologySyncService } from '../sync/topology-sync.service.js';
import type { UpdatePositionDto } from './dto/update-position.dto.js';
import {
  normaliseRotation,
  toPlacedDevice,
  toTopologyLink,
} from './topology.mapper.js';

const LINK_SYNC_WAIT_MS = 3000;

function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const portOrder = { orderBy: { portNumber: 'asc' as const } };
const endpoint = { select: { id: true, portNumber: true, deviceId: true } };

@Injectable()
export class TopologyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: TopologySyncService,
  ) {}

  async getTopology(floorPlanId: string): Promise<TopologyResponse> {
    const plan = await this.prisma.floorPlan.findUnique({
      where: { id: floorPlanId },
      select: {
        id: true,
        spatialCoordinates: {
          include: { device: { include: { ports: portOrder } } },
        },
        networkLinks: {
          include: { sourcePort: endpoint, destinationPort: endpoint },
        },
      },
    });
    if (!plan)
      throw new NotFoundException(`Floor plan ${floorPlanId} not found`);
    return {
      floorPlanId: plan.id,
      devices: plan.spatialCoordinates
        .map((c) => toPlacedDevice(c.device, c))
        .sort((a, b) => a.name.localeCompare(b.name)),
      links: plan.networkLinks.map(toTopologyLink),
    };
  }

  async setPosition(
    floorPlanId: string,
    deviceId: string,
    dto: UpdatePositionDto,
  ): Promise<PlacedDevice> {
    const plan = await this.prisma.floorPlan.findUnique({
      where: { id: floorPlanId },
      select: { width: true, height: true },
    });
    if (!plan)
      throw new NotFoundException(`Floor plan ${floorPlanId} not found`);
    if (dto.x > plan.width || dto.y > plan.height) {
      throw new BadRequestException(
        `Position must lie within the plan (0…${plan.width} × 0…${plan.height})`,
      );
    }
    const device = await this.prisma.networkDevice.findUnique({
      where: { id: deviceId },
      include: { ports: portOrder },
    });
    if (!device) throw new NotFoundException(`Device ${deviceId} not found`);

    const where = { deviceId_floorPlanId: { deviceId, floorPlanId } };
    const placedBefore = await this.prisma.spatialCoordinate.findUnique({
      where,
      select: { id: true },
    });
    const position = {
      x: dto.x,
      y: dto.y,
      ...(dto.rotation !== undefined && {
        rotation: normaliseRotation(dto.rotation),
      }),
    };
    const coordinate = await this.prisma.spatialCoordinate.upsert({
      where,
      create: { deviceId, floorPlanId, ...position },
      update: position,
    });
    if (!placedBefore) {
      await withTimeout(this.sync.requestSync(), LINK_SYNC_WAIT_MS);
    }
    return toPlacedDevice(device, coordinate);
  }

  async removePosition(floorPlanId: string, deviceId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.spatialCoordinate.deleteMany({
        where: { deviceId, floorPlanId },
      });
      if (count === 0) {
        throw new NotFoundException('The device is not placed on this plan');
      }
      await tx.networkLink.deleteMany({
        where: {
          floorPlanId,
          OR: [{ sourcePort: { deviceId } }, { destinationPort: { deviceId } }],
        },
      });
    });
  }
}
