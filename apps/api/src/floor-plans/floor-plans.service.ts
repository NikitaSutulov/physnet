import { randomUUID } from 'node:crypto';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  BuildingFloors,
  FloorPlanListQuery,
  FloorPlanResponse,
} from '@physnet/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
import type { FloorPlan } from '../generated/prisma/client.js';
import type { CreateFloorPlanDto } from './dto/create-floor-plan.dto.js';
import type { UpdateFloorPlanDto } from './dto/update-floor-plan.dto.js';
import type { ValidatedFloorPlanFile } from './floor-plan-file.pipe.js';

export const IMAGE_URL_TTL_SECONDS = 60 * 60;

@Injectable()
export class FloorPlansService {
  private readonly logger = new Logger(FloorPlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(
    dto: CreateFloorPlanDto,
    file: ValidatedFloorPlanFile,
    createdBy: string,
  ): Promise<FloorPlanResponse> {
    const key = `floor-plans/${Date.now()}-${randomUUID()}.${file.extension}`;
    await this.storage.upload({
      key,
      body: file.buffer,
      contentType: file.mimeType,
    });

    try {
      const plan = await this.prisma.floorPlan.create({
        data: {
          title: dto.title,
          building: dto.building ?? '',
          floorLevel: dto.floorLevel ?? 0,
          scale: dto.scale ?? 1,
          imageUrl: key,
          width: file.width,
          height: file.height,
          createdBy,
        },
      });
      return this.toResponse(plan);
    } catch (e) {
      await this.deleteObjectQuietly(key);
      throw e;
    }
  }

  async findAll(query: FloorPlanListQuery): Promise<FloorPlanResponse[]> {
    const plans = await this.prisma.floorPlan.findMany({
      where: {
        ...(query.building !== undefined && { building: query.building }),
        ...(query.search && {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { building: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ building: 'asc' }, { floorLevel: 'asc' }, { title: 'asc' }],
    });
    return Promise.all(plans.map((p) => this.toResponse(p)));
  }

  async findOne(id: string): Promise<FloorPlanResponse> {
    return this.toResponse(await this.getOrThrow(id));
  }

  async update(
    id: string,
    dto: UpdateFloorPlanDto,
  ): Promise<FloorPlanResponse> {
    await this.getOrThrow(id);
    const plan = await this.prisma.floorPlan.update({
      where: { id },
      data: dto,
    });
    return this.toResponse(plan);
  }

  async remove(id: string): Promise<void> {
    const plan = await this.getOrThrow(id);
    await this.prisma.floorPlan.delete({ where: { id } });
    await this.deleteObjectQuietly(plan.imageUrl);
  }

  async buildings(): Promise<BuildingFloors[]> {
    const plans = await this.prisma.floorPlan.findMany({
      select: { id: true, title: true, building: true, floorLevel: true },
      orderBy: [{ building: 'asc' }, { floorLevel: 'asc' }, { title: 'asc' }],
    });
    const byBuilding = new Map<string, BuildingFloors>();
    for (const { building, ...floor } of plans) {
      const entry = byBuilding.get(building) ?? { building, floors: [] };
      entry.floors.push(floor);
      byBuilding.set(building, entry);
    }
    return [...byBuilding.values()];
  }

  async getOrThrow(id: string): Promise<FloorPlan> {
    const plan = await this.prisma.floorPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Floor plan ${id} not found`);
    return plan;
  }

  async toResponse(plan: FloorPlan): Promise<FloorPlanResponse> {
    const imageUrl = await this.storage.getPresignedDownloadUrl({
      key: plan.imageUrl,
      expiresIn: IMAGE_URL_TTL_SECONDS,
    });
    return {
      ...plan,
      imageUrl,
      imageUrlExpiresAt: new Date(
        Date.now() + IMAGE_URL_TTL_SECONDS * 1000,
      ).toISOString(),
    };
  }

  private async deleteObjectQuietly(key: string): Promise<void> {
    try {
      await this.storage.delete({ key });
    } catch (e) {
      this.logger.warn(
        `Failed to delete object ${key}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
