import type { DeviceTypeName, SyncStatus } from './devices.ts';

export interface DashboardStats {
  devices: {
    total: number;
    offline: number;
    unplaced: number;
    byType: Record<DeviceTypeName, number>;
  };
  ports: { total: number; up: number };
  links: { total: number; down: number };
  floorPlans: number;
  buildings: number;
  controller: Pick<SyncStatus, 'enabled' | 'controllerReachable' | 'lastSuccessAt'>;
}
