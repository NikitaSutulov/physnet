import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DeviceListQuery, UpdateDeviceRequest } from '@physnet/shared';
import {
  deleteDevice,
  getOfflineSummary,
  getSyncStatus,
  listDevices,
  purgeOfflineDevices,
  runSync,
  updateDevice,
} from '@/services/devices';

export const deviceKeys = {
  all: ['devices'] as const,
  list: (q: DeviceListQuery) => ['devices', 'list', q] as const,
  offlineSummary: ['devices', 'offline-summary'] as const,
  syncStatus: ['sync', 'status'] as const,
};

export function useDevices(query: DeviceListQuery) {
  return useQuery({
    queryKey: deviceKeys.list(query),
    queryFn: () => listDevices(query),
    refetchInterval: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function useSyncStatus() {
  return useQuery({
    queryKey: deviceKeys.syncStatus,
    queryFn: getSyncStatus,
    refetchInterval: 10_000,
  });
}

export function useRunSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runSync,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: deviceKeys.all }),
        queryClient.invalidateQueries({ queryKey: deviceKeys.syncStatus }),
      ]),
  });
}

export function useRenameDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateDeviceRequest & { id: string }) => updateDevice(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deviceKeys.all }),
  });
}

export function useOfflineSummary(enabled: boolean) {
  return useQuery({
    queryKey: deviceKeys.offlineSummary,
    queryFn: getOfflineSummary,
    enabled,
    refetchInterval: 15_000,
  });
}

export function usePurgeOfflineDevices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: purgeOfflineDevices,
    onSettled: () => queryClient.invalidateQueries({ queryKey: deviceKeys.all }),
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDevice,
    onSettled: () => queryClient.invalidateQueries({ queryKey: deviceKeys.all }),
  });
}
