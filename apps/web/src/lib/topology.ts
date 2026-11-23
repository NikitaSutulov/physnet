import type {
  NetworkDeviceWithPorts,
  PlacedDevice,
  TopologyLink,
  TopologyResponse,
  UpdatePositionRequest,
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
