import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateLinkRequest,
  NetworkDeviceWithPorts,
  TopologyLink,
  TopologyResponse,
  UpdateLinkRequest,
  UpdatePositionRequest,
} from '@physnet/shared';
import { withLink, withoutDevice, withoutLink, withPosition } from '@/lib/topology';
import {
  createLink,
  deleteLink,
  getTopology,
  listUnplacedDevices,
  removeDevicePosition,
  setDevicePosition,
  updateLink,
} from '@/services/topology';
import { setPortEnabled } from '@/services/devices';
import { useRealtimeStore } from '@/store/realtimeStore';
import { deviceKeys } from './useDevices';

export const topologyKeys = {
  detail: (planId: string) => ['topology', planId] as const,
  unplaced: (planId: string) => ['devices', 'unplaced', planId] as const,
};

export function useTopology(planId: string) {
  const online = useRealtimeStore((s) => s.status === 'online');
  return useQuery({
    queryKey: topologyKeys.detail(planId),
    queryFn: () => getTopology(planId),
    refetchInterval: online ? false : 5_000,
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

export function useCreateLink(planId: string) {
  const cache = useOptimistic(planId);
  return useMutation({
    mutationFn: (body: CreateLinkRequest) => createLink(planId, body),
    onSuccess: async (link) => {
      const { topology } = await cache.snapshot();
      cache.write(topology && withLink(topology, link));
    },
    onSettled: () => cache.settle(),
  });
}

export interface UpdateLinkInput extends UpdateLinkRequest {
  link: TopologyLink;
}

export function useUpdateLink(planId: string) {
  const cache = useOptimistic(planId);
  return useMutation({
    mutationFn: ({ link, ...body }: UpdateLinkInput) => updateLink(link.id, body),
    onMutate: async ({ link, ...body }) => {
      const before = await cache.snapshot();
      cache.write(before.topology && withLink(before.topology, { ...link, ...body }));
      return before;
    },
    onError: (_error, _input, before) => cache.restore(before),
    onSettled: () => cache.settle(),
  });
}

export function useDeleteLink(planId: string) {
  const cache = useOptimistic(planId);
  return useMutation({
    mutationFn: deleteLink,
    onMutate: async (linkId: string) => {
      const before = await cache.snapshot();
      cache.write(before.topology && withoutLink(before.topology, linkId));
      return before;
    },
    onError: (_error, _linkId, before) => cache.restore(before),
    onSettled: () => cache.settle(),
  });
}

export function useSetPortEnabled(planId: string) {
  const cache = useOptimistic(planId);
  return useMutation({
    mutationFn: ({ portId, isEnabled }: { portId: string; isEnabled: boolean }) =>
      setPortEnabled(portId, isEnabled),
    onMutate: async ({ portId, isEnabled }) => {
      const before = await cache.snapshot();
      cache.write(
        before.topology && {
          ...before.topology,
          devices: before.topology.devices.map((d) => ({
            ...d,
            ports: d.ports.map((p) => (p.id === portId ? { ...p, isEnabled } : p)),
          })),
        },
      );
      return before;
    },
    onError: (_error, _input, before) => cache.restore(before),
    onSettled: () => cache.settle(),
  });
}
