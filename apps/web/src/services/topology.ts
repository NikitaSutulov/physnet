import type {
  NetworkDeviceWithPorts,
  PlacedDevice,
  TopologyResponse,
  UpdatePositionRequest,
} from '@physnet/shared';
import { api } from './api';

export async function getTopology(floorPlanId: string): Promise<TopologyResponse> {
  const { data } = await api.get<TopologyResponse>(`/floor-plans/${floorPlanId}/topology`);
  return data;
}

export async function listUnplacedDevices(floorPlanId: string): Promise<NetworkDeviceWithPorts[]> {
  const { data } = await api.get<NetworkDeviceWithPorts[]>('/devices/unplaced', {
    params: { floorPlanId },
  });
  return data;
}

export async function setDevicePosition(
  floorPlanId: string,
  deviceId: string,
  body: UpdatePositionRequest,
): Promise<PlacedDevice> {
  const { data } = await api.put<PlacedDevice>(
    `/floor-plans/${floorPlanId}/devices/${deviceId}/position`,
    body,
  );
  return data;
}

export async function removeDevicePosition(floorPlanId: string, deviceId: string): Promise<void> {
  await api.delete(`/floor-plans/${floorPlanId}/devices/${deviceId}/position`);
}
