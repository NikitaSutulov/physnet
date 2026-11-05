export type AdminRole = 'ADMIN' | string;
export type DeviceStatus = 'ACTIVE' | 'INACTIVE' | 'OFFLINE' | string;
export type CableType = 'COPPER' | 'OPTICAL' | string;
export type LinkStatus = 'ACTIVE' | 'INACTIVE' | 'DOWN' | string;

export interface Administrator {
  id: string;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FloorPlan {
  id: string;
  title: string;
  imageUrl: string;
  scale: number;
  width: number;
  height: number;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface NetworkDevice {
  id: string;
  onosDeviceId: string;
  name: string;
  deviceType: string;
  ipAddress: string | null;
  macAddress: string | null;
  status: DeviceStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DevicePort {
  id: string;
  deviceId: string;
  portNumber: string;
  macAddress: string | null;
  ipAddress: string | null;
  speedMbps: number | null;
  isEnabled: boolean;
  createdAt: Date | string;
}

export interface SpatialCoordinate {
  id: string;
  deviceId: string;
  floorPlanId: string;
  x: number;
  y: number;
  rotation: number;
  updatedAt: Date | string;
}

export interface Waypoint {
  x: number;
  y: number;
}

export interface NetworkLink {
  id: string;
  onosLinkId: string | null;
  sourcePortId: string;
  destinationPortId: string;
  floorPlanId: string;
  waypoints: Waypoint[] | unknown;
  cableType: CableType;
  status: LinkStatus;
}

export interface RoutingPolicy {
  id: string;
  name: string;
  intentKey: string | null;
  intentType: string;
  payload: Record<string, unknown>;
  isApplied: boolean;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
