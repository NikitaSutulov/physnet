import type {
  NetworkDeviceWithPorts,
  PlacedDevice,
  TopologyLink,
  TopologyResponse,
  UpdatePositionRequest,
  Waypoint,
} from '@physnet/shared';
import { clamp, snap, type Point, type Size } from './geometry';

export function normaliseRotation(degrees: number): number {
  const r = Math.round((((degrees % 360) + 360) % 360) * 100) / 100;
  return r === 360 ? 0 : r;
}

export function placePoint(point: Point, plan: Size, snapStep: number): Point {
  const snapped = snapStep > 0 ? { x: snap(point.x, snapStep), y: snap(point.y, snapStep) } : point;
  return {
    x: clamp(snapped.x, 0, plan.width),
    y: clamp(snapped.y, 0, plan.height),
  };
}

export function withPosition(
  topology: TopologyResponse,
  device: NetworkDeviceWithPorts,
  position: UpdatePositionRequest,
): TopologyResponse {
  const current = topology.devices.find((d) => d.id === device.id);
  const placed: PlacedDevice = {
    ...device,
    position: {
      x: position.x,
      y: position.y,
      rotation: position.rotation ?? current?.position.rotation ?? 0,
      updatedAt: new Date().toISOString(),
    },
  };
  return {
    ...topology,
    devices: current
      ? topology.devices.map((d) => (d.id === device.id ? placed : d))
      : [...topology.devices, placed],
  };
}

export function withoutDevice(topology: TopologyResponse, deviceId: string): TopologyResponse {
  return {
    ...topology,
    devices: topology.devices.filter((d) => d.id !== deviceId),
    links: topology.links.filter(
      (l) => l.source.deviceId !== deviceId && l.destination.deviceId !== deviceId,
    ),
  };
}

export function linkPoints(
  link: TopologyLink,
  positions: ReadonlyMap<string, Point>,
): number[] | null {
  const a = positions.get(link.source.deviceId);
  const b = positions.get(link.destination.deviceId);
  if (!a || !b) return null;
  return [a, ...link.waypoints, b].flatMap((p) => [p.x, p.y]);
}

export const DEVICE_DRAG_TYPE = 'application/x-physnet-device';

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function insertWaypoint(
  from: Point,
  to: Point,
  waypoints: Waypoint[],
  at: Point,
): Waypoint[] {
  const path = [from, ...waypoints, to];
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = distanceToSegment(at, path[i], path[i + 1]);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return [...waypoints.slice(0, best), { x: at.x, y: at.y }, ...waypoints.slice(best)];
}

export function busyPortIds(links: TopologyLink[]): Set<string> {
  return new Set(links.flatMap((l) => [l.source.portId, l.destination.portId]));
}

export function withLink(topology: TopologyResponse, link: TopologyLink): TopologyResponse {
  const exists = topology.links.some((l) => l.id === link.id);
  return {
    ...topology,
    links: exists
      ? topology.links.map((l) => (l.id === link.id ? link : l))
      : [...topology.links, link],
  };
}

export function withoutLink(topology: TopologyResponse, linkId: string): TopologyResponse {
  return { ...topology, links: topology.links.filter((l) => l.id !== linkId) };
}
