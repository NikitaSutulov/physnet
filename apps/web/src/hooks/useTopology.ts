import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  NetworkDeviceWithPorts,
  TopologyResponse,
  UpdatePositionRequest,
} from '@physnet/shared';
import { withoutDevice, withPosition } from '@/lib/topology';
import {
  getTopology,
  listUnplacedDevices,
  removeDevicePosition,
  setDevicePosition,
} from '@/services/topology';
import { deviceKeys } from './useDevices';

export const topologyKeys = {
  detail: (planId: string) => ['topology', planId] as const,
  unplaced: (planId: string) => ['devices', 'unplaced', planId] as const,
};

export function useTopology(planId: string) {
  return useQuery({
    queryKey: topologyKeys.detail(planId),
    queryFn: () => getTopology(planId),
    refetchInterval: 5_000,
  });
}

export function useUnplacedDevices(planId: string) {
  return useQuery({
    queryKey: topologyKeys.unplaced(planId),
    queryFn: () => listUnplacedDevices(planId),
    refetchInterval: 15_000,
  });
}

interface Snapshot {
  topology?: TopologyResponse;
  unplaced?: NetworkDeviceWithPorts[];
}

function useOptimistic(planId: string) {
  const queryClient = useQueryClient();
  const keys = { topology: topologyKeys.detail(planId), unplaced: topologyKeys.unplaced(planId) };

  return {
    async snapshot(): Promise<Snapshot> {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: keys.topology }),
        queryClient.cancelQueries({ queryKey: keys.unplaced }),
      ]);
      return {
        topology: queryClient.getQueryData(keys.topology),
        unplaced: queryClient.getQueryData(keys.unplaced),
      };
    },
    write(topology?: TopologyResponse, unplaced?: NetworkDeviceWithPorts[]) {
      if (topology) queryClient.setQueryData(keys.topology, topology);
      if (unplaced) queryClient.setQueryData(keys.unplaced, unplaced);
    },
    restore(snapshot: Snapshot | undefined) {
      if (!snapshot) return;
      queryClient.setQueryData(keys.topology, snapshot.topology);
      queryClient.setQueryData(keys.unplaced, snapshot.unplaced);
    },
    settle() {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.topology }),
        queryClient.invalidateQueries({ queryKey: deviceKeys.all }),
      ]);
    },
  };
}

export interface MoveDeviceInput extends UpdatePositionRequest {
  device: NetworkDeviceWithPorts;
}

export function useMoveDevice(planId: string) {
  const cache = useOptimistic(planId);
  return useMutation({
    mutationFn: ({ device, ...position }: MoveDeviceInput) =>
      setDevicePosition(planId, device.id, position),
    onMutate: async ({ device, ...position }) => {
      const before = await cache.snapshot();
      cache.write(
        before.topology && withPosition(before.topology, device, position),
        before.unplaced?.filter((d) => d.id !== device.id),
      );
      return before;
    },
    onError: (_error, _input, before) => cache.restore(before),
    onSettled: () => cache.settle(),
  });
}

export function useUnplaceDevice(planId: string) {
  const cache = useOptimistic(planId);
  return useMutation({
    mutationFn: (deviceId: string) => removeDevicePosition(planId, deviceId),
    onMutate: async (deviceId) => {
      const before = await cache.snapshot();
      cache.write(before.topology && withoutDevice(before.topology, deviceId));
      return before;
    },
    onError: (_error, _deviceId, before) => cache.restore(before),
    onSettled: () => cache.settle(),
  });
}
