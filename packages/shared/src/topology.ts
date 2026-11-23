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

export const CABLE_TYPES = ['COPPER', 'OPTICAL'] as const;
export type CableTypeName = (typeof CABLE_TYPES)[number];

export const MAX_WAYPOINTS = 50;

export interface CreateLinkRequest {
  sourcePortId: string;
  destinationPortId: string;
  cableType?: CableTypeName;
  waypoints?: Waypoint[];
}

export interface UpdateLinkRequest {
  cableType?: CableTypeName;
  waypoints?: Waypoint[];
}
