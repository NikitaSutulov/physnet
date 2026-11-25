import type { DevicePort, NetworkDevice } from './entities.ts';

export const DEVICE_TYPES = ['SWITCH', 'ROUTER', 'HOST', 'ACCESS_POINT', 'OTHER'] as const;
export type DeviceTypeName = (typeof DEVICE_TYPES)[number];

export const DEVICE_STATUSES = ['ACTIVE', 'OFFLINE'] as const;

export interface NetworkDeviceWithPorts extends NetworkDevice {
  ports: DevicePort[];
}

export interface PlanRef {
  id: string;
  title: string;
  building: string;
  floorLevel: number;
}

export interface UnplacedDevice extends NetworkDeviceWithPorts {
  placedOn: PlanRef[];
}

export interface DeviceListQuery {
  type?: DeviceTypeName;
  status?: string;
  search?: string;
}

export interface UpdateDeviceRequest {
  name?: string;
}

export interface OfflineDevicesSummary {
  total: number;
  placed: number;
}

export interface PurgeOfflineDevicesQuery {
  includePlaced?: boolean;
}

export interface PurgeOfflineDevicesResult {
  deleted: number;
  keptPlaced: number;
}

export interface SyncSummary {
  devicesCreated: number;
  devicesUpdated: number;
  devicesWentOffline: number;
  portsUpserted: number;
  linksCreated: number;
  linksUpdated: number;
  linksWentDown: number;
  /** Cables whose ports were recabled or whose devices left the plan. */
  linksRemoved: number;
}

export interface SyncStatus {
  enabled: boolean;
  intervalMs: number;
  running: boolean;
  controllerReachable: boolean | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastSummary: SyncSummary | null;
}
