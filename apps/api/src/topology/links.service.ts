import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TopologyLink, Waypoint } from '@physnet/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { TopologyEventsService } from '../realtime/topology-events.service.js';
import type { CreateLinkDto, UpdateLinkDto } from './dto/link.dto.js';
import { toTopologyLink } from './topology.mapper.js';

const endpoint = { select: { id: true, portNumber: true, deviceId: true } };
const withEndpoints = { sourcePort: endpoint, destinationPort: endpoint };

interface PlanSize {
  width: number;
  height: number;
}

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: TopologyEventsService,
  ) {}

  async create(
    floorPlanId: string,
    dto: CreateLinkDto,
    origin?: string,
  ): Promise<TopologyLink> {
    const plan = await this.prisma.floorPlan.findUnique({
      where: { id: floorPlanId },
      select: { width: true, height: true },
    });
    if (!plan)
      throw new NotFoundException(`Floor plan ${floorPlanId} not found`);
    if (dto.waypoints) assertWithin(plan, dto.waypoints);

    const portIds = [dto.sourcePortId, dto.destinationPortId];
    const ports = await this.prisma.devicePort.findMany({
      where: { id: { in: portIds } },
      select: {
        id: true,
        deviceId: true,
        device: {
          select: {
            name: true,
            spatialCoordinates: {
              where: { floorPlanId },
              select: { id: true },
            },
          },
        },
      },
    });
    const source = ports.find((p) => p.id === dto.sourcePortId);
    const destination = ports.find((p) => p.id === dto.destinationPortId);
    if (!source || !destination) throw new NotFoundException('Port not found');
    if (source.deviceId === destination.deviceId) {
      throw new BadRequestException(
        'A cable must connect two different devices',
      );
    }
    for (const p of [source, destination]) {
      if (p.device.spatialCoordinates.length === 0) {
        throw new BadRequestException(
          `Device ${p.device.name} is not placed on this plan`,
        );
      }
    }

    const busy = await this.prisma.networkLink.findFirst({
      where: {
        floorPlanId,
        OR: [
          { sourcePortId: { in: portIds } },
          { destinationPortId: { in: portIds } },
        ],
      },
      select: { id: true },
    });
    if (busy) {
      throw new ConflictException('A port already has a cable on this plan');
    }

    const link = await this.prisma.networkLink.create({
      data: {
        floorPlanId,
        sourcePortId: source.id,
        destinationPortId: destination.id,
        cableType: dto.cableType ?? 'COPPER',
        waypoints: toJson(dto.waypoints ?? []),
      },
      include: withEndpoints,
    });
    return this.announce(toTopologyLink(link), origin);
  }

  async update(
    id: string,
    dto: UpdateLinkDto,
    origin?: string,
  ): Promise<TopologyLink> {
    const link = await this.prisma.networkLink.findUnique({
      where: { id },
      select: { floorPlan: { select: { width: true, height: true } } },
    });
    if (!link) throw new NotFoundException(`Link ${id} not found`);
    if (dto.waypoints) assertWithin(link.floorPlan, dto.waypoints);

    const updated = await this.prisma.networkLink.update({
      where: { id },
      data: {
        ...(dto.cableType && { cableType: dto.cableType }),
        ...(dto.waypoints && { waypoints: toJson(dto.waypoints) }),
      },
      include: withEndpoints,
    });
    return this.announce(toTopologyLink(updated), origin);
  }

  async remove(id: string, origin?: string): Promise<void> {
    const link = await this.prisma.networkLink.findUnique({
      where: { id },
      select: { onosLinkId: true, floorPlanId: true },
    });
    if (!link) throw new NotFoundException(`Link ${id} not found`);
    if (link.onosLinkId) {
      throw new ConflictException(
        'This cable mirrors an ONOS link; remove one of its devices from the plan instead',
      );
    }
    await this.prisma.networkLink.delete({ where: { id } });
    this.events.linkDeleted(
      { floorPlanId: link.floorPlanId, linkId: id },
      origin,
    );
  }

  private announce(link: TopologyLink, origin?: string): TopologyLink {
    this.events.linkUpdated({ floorPlanId: link.floorPlanId, link }, origin);
    return link;
  }
}

function assertWithin(plan: PlanSize, waypoints: Waypoint[]): void {
  const outside = waypoints.find((p) => p.x > plan.width || p.y > plan.height);
  if (outside) {
    throw new BadRequestException(
      `Waypoints must lie within the plan (0…${plan.width} × 0…${plan.height})`,
    );
  }
}

function toJson(waypoints: Waypoint[]): Array<{ x: number; y: number }> {
  return waypoints.map(({ x, y }) => ({ x, y }));
}
