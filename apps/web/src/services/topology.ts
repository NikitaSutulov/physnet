import type {
  CreateLinkRequest,
  PlacedDevice,
  TopologyLink,
  TopologyResponse,
  UpdateLinkRequest,
  UnplacedDevice,
  UpdatePositionRequest,
} from '@physnet/shared';
import { api } from './api';

export async function getTopology(floorPlanId: string): Promise<TopologyResponse> {
  const { data } = await api.get<TopologyResponse>(`/floor-plans/${floorPlanId}/topology`);
  return data;
}

export async function listUnplacedDevices(floorPlanId: string): Promise<UnplacedDevice[]> {
  const { data } = await api.get<UnplacedDevice[]>('/devices/unplaced', {
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

export async function createLink(
  floorPlanId: string,
  body: CreateLinkRequest,
): Promise<TopologyLink> {
  const { data } = await api.post<TopologyLink>(`/floor-plans/${floorPlanId}/links`, body);
  return data;
}

export async function updateLink(linkId: string, body: UpdateLinkRequest): Promise<TopologyLink> {
  const { data } = await api.patch<TopologyLink>(`/links/${linkId}`, body);
  return data;
}

export async function deleteLink(linkId: string): Promise<void> {
  await api.delete(`/links/${linkId}`);
}
