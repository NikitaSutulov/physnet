import type { PlacedDevice, TopologyLink, Waypoint } from '@physnet/shared';
import type {
  DevicePort,
  NetworkDevice,
  NetworkLink,
  SpatialCoordinate,
} from '../generated/prisma/client.js';

export function normaliseRotation(degrees: number): number {
  const r = degrees % 360;
  return r < 0 ? r + 360 : r === 0 ? 0 : r; // also turns -0 into 0
}

export function parseWaypoints(value: unknown): Waypoint[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((p: unknown) => {
    if (typeof p !== 'object' || p === null) return [];
    const { x, y } = p as Record<string, unknown>;
    return typeof x === 'number' &&
      typeof y === 'number' &&
      Number.isFinite(x) &&
      Number.isFinite(y)
      ? [{ x, y }]
      : [];
  });
}

export function toPlacedDevice(
  device: NetworkDevice & { ports: DevicePort[] },
  coordinate: SpatialCoordinate,
): PlacedDevice {
  return {
    ...device,
    position: {
      x: coordinate.x,
      y: coordinate.y,
      rotation: coordinate.rotation,
      updatedAt: coordinate.updatedAt.toISOString(),
    },
  };
}

type LinkWithPorts = NetworkLink & {
  sourcePort: Pick<DevicePort, 'id' | 'portNumber' | 'deviceId'>;
  destinationPort: Pick<DevicePort, 'id' | 'portNumber' | 'deviceId'>;
};

export function toTopologyLink(link: LinkWithPorts): TopologyLink {
  const end = (p: LinkWithPorts['sourcePort']) => ({
    portId: p.id,
    portNumber: p.portNumber,
    deviceId: p.deviceId,
  });
  return {
    id: link.id,
    onosLinkId: link.onosLinkId,
    floorPlanId: link.floorPlanId,
    source: end(link.sourcePort),
    destination: end(link.destinationPort),
    waypoints: parseWaypoints(link.waypoints),
    cableType: link.cableType,
    status: link.status,
  };
}
