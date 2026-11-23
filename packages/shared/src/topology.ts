import type { NetworkDeviceWithPorts } from './devices.ts';
import type { CableType, LinkStatus, Waypoint } from './entities.ts';

export interface DevicePosition {
  x: number;
  y: number;
  rotation: number;
  updatedAt: string;
}

export interface PlacedDevice extends NetworkDeviceWithPorts {
  position: DevicePosition;
}

export interface LinkEndpoint {
  portId: string;
  portNumber: string;
  deviceId: string;
}

export interface TopologyLink {
  id: string;
  onosLinkId: string | null;
  floorPlanId: string;
  source: LinkEndpoint;
  destination: LinkEndpoint;
  waypoints: Waypoint[];
  cableType: CableType;
  status: LinkStatus;
}

export interface TopologyResponse {
  floorPlanId: string;
  devices: PlacedDevice[];
  links: TopologyLink[];
}

export interface UpdatePositionRequest {
  x: number;
  y: number;
  rotation?: number;
}

export interface UnplacedDevicesQuery {
  floorPlanId: string;
}
