import type {
  DeviceListQuery,
  NetworkDeviceWithPorts,
  OfflineDevicesSummary,
  PurgeOfflineDevicesResult,
  SyncStatus,
  SyncSummary,
  UpdateDeviceRequest,
} from '@physnet/shared';
import { api } from './api';

export async function listDevices(query: DeviceListQuery = {}): Promise<NetworkDeviceWithPorts[]> {
  const { data } = await api.get<NetworkDeviceWithPorts[]>('/devices', { params: query });
  return data;
}

export async function updateDevice(
  id: string,
  body: UpdateDeviceRequest,
): Promise<NetworkDeviceWithPorts> {
  const { data } = await api.patch<NetworkDeviceWithPorts>(`/devices/${id}`, body);
  return data;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const { data } = await api.get<SyncStatus>('/sync/status');
  return data;
}

export async function runSync(): Promise<SyncSummary> {
  const { data } = await api.post<SyncSummary>('/sync');
  return data;
}

export async function getOfflineSummary(): Promise<OfflineDevicesSummary> {
  const { data } = await api.get<OfflineDevicesSummary>('/devices/offline/summary');
  return data;
}

export async function purgeOfflineDevices(
  includePlaced: boolean,
): Promise<PurgeOfflineDevicesResult> {
  const { data } = await api.delete<PurgeOfflineDevicesResult>('/devices/offline', {
    params: { includePlaced },
  });
  return data;
}

export async function deleteDevice(id: string): Promise<void> {
  await api.delete(`/devices/${id}`);
}
