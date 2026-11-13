import type {
  BuildingFloors,
  FloorPlanListQuery,
  FloorPlanResponse,
  UpdateFloorPlanRequest,
} from '@physnet/shared';
import { api } from './api';

export interface CreateFloorPlanInput {
  file: File;
  title: string;
  building?: string;
  floorLevel?: number;
}

export async function listFloorPlans(query: FloorPlanListQuery = {}): Promise<FloorPlanResponse[]> {
  const { data } = await api.get<FloorPlanResponse[]>('/floor-plans', { params: query });
  return data;
}

export async function getFloorPlan(id: string): Promise<FloorPlanResponse> {
  const { data } = await api.get<FloorPlanResponse>(`/floor-plans/${id}`);
  return data;
}

export async function listBuildings(): Promise<BuildingFloors[]> {
  const { data } = await api.get<BuildingFloors[]>('/buildings');
  return data;
}

export async function createFloorPlan(
  input: CreateFloorPlanInput,
  onProgress?: (fraction: number) => void,
): Promise<FloorPlanResponse> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('title', input.title);
  if (input.building) form.append('building', input.building);
  if (input.floorLevel !== undefined) form.append('floorLevel', String(input.floorLevel));

  const { data } = await api.post<FloorPlanResponse>('/floor-plans', form, {
    onUploadProgress: (e) => e.total && onProgress?.(e.loaded / e.total),
  });
  return data;
}

export async function updateFloorPlan(
  id: string,
  body: UpdateFloorPlanRequest,
): Promise<FloorPlanResponse> {
  const { data } = await api.patch<FloorPlanResponse>(`/floor-plans/${id}`, body);
  return data;
}

export async function deleteFloorPlan(id: string): Promise<void> {
  await api.delete(`/floor-plans/${id}`);
}
