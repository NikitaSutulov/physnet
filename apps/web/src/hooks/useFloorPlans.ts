import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FloorPlanListQuery, UpdateFloorPlanRequest } from '@physnet/shared';
import {
  createFloorPlan,
  deleteFloorPlan,
  getFloorPlan,
  listBuildings,
  listFloorPlans,
  updateFloorPlan,
  type CreateFloorPlanInput,
} from '@/services/floorPlans';

export const floorPlanKeys = {
  all: ['floor-plans'] as const,
  list: (q: FloorPlanListQuery) => ['floor-plans', 'list', q] as const,
  detail: (id: string) => ['floor-plans', 'detail', id] as const,
  buildings: ['floor-plans', 'buildings'] as const,
};

const URL_REFRESH_MS = 45 * 60 * 1000;

export function useFloorPlans(query: FloorPlanListQuery) {
  return useQuery({
    queryKey: floorPlanKeys.list(query),
    queryFn: () => listFloorPlans(query),
    refetchInterval: URL_REFRESH_MS,
    placeholderData: (prev) => prev,
  });
}

export function useFloorPlan(id: string) {
  return useQuery({
    queryKey: floorPlanKeys.detail(id),
    queryFn: () => getFloorPlan(id),
    refetchInterval: URL_REFRESH_MS,
  });
}

export function useBuildings() {
  return useQuery({ queryKey: floorPlanKeys.buildings, queryFn: listBuildings });
}

export function useCreateFloorPlan(onProgress?: (fraction: number) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFloorPlanInput) => createFloorPlan(input, onProgress),
    onSuccess: (plan) => {
      queryClient.setQueryData(floorPlanKeys.detail(plan.id), plan);
      return queryClient.invalidateQueries({ queryKey: floorPlanKeys.all });
    },
  });
}

export function useUpdateFloorPlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateFloorPlanRequest) => updateFloorPlan(id, body),
    onSuccess: (plan) => {
      queryClient.setQueryData(floorPlanKeys.detail(plan.id), plan);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['floor-plans', 'list'] }),
        queryClient.invalidateQueries({ queryKey: floorPlanKeys.buildings }),
      ]);
    },
  });
}

export function useDeleteFloorPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFloorPlan,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: floorPlanKeys.detail(id) });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['floor-plans', 'list'] }),
        queryClient.invalidateQueries({ queryKey: floorPlanKeys.buildings }),
      ]);
    },
  });
}
