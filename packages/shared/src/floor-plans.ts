import type { FloorPlan } from './entities.ts';

export interface FloorPlanResponse extends FloorPlan {
  imageUrlExpiresAt: string;
}

export interface UpdateFloorPlanRequest {
  title?: string;
  building?: string;
  floorLevel?: number;
  scale?: number;
}

export interface FloorPlanListQuery {
  building?: string;
  search?: string;
}

export interface BuildingFloors {
  building: string;
  floors: Array<Pick<FloorPlan, 'id' | 'title' | 'floorLevel'>>;
}

export const FLOOR_PLAN_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const;

export const FLOOR_PLAN_MAX_BYTES = 20 * 1024 * 1024;
