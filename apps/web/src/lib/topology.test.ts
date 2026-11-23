import { describe, expect, it } from 'vitest';
import type { NetworkDeviceWithPorts, TopologyLink, TopologyResponse } from '@physnet/shared';
import { linkPoints, normaliseRotation, placePoint, withoutDevice, withPosition } from './topology';

const device = (id: string): NetworkDeviceWithPorts => ({
  id,
  onosDeviceId: `of:${id}`,
  name: id,
  deviceType: 'SWITCH',
  ipAddress: null,
  macAddress: null,
  status: 'ACTIVE',
  createdAt: '',
  updatedAt: '',
  ports: [],
});

const link = (id: string, a: string, b: string): TopologyLink => ({
  id,
  onosLinkId: null,
  floorPlanId: 'p',
  source: { portId: `${a}1`, portNumber: '1', deviceId: a },
  destination: { portId: `${b}1`, portNumber: '1', deviceId: b },
  waypoints: [{ x: 5, y: 5 }],
  cableType: 'COPPER',
  status: 'ACTIVE',
});

const topo: TopologyResponse = {
  floorPlanId: 'p',
  devices: [
    { ...device('a'), position: { x: 0, y: 0, rotation: 90, updatedAt: '' } },
    { ...device('b'), position: { x: 10, y: 10, rotation: 0, updatedAt: '' } },
  ],
  links: [link('ab', 'a', 'b')],
};

describe('topology helpers', () => {
  it('clamps to the plan and snaps to the grid', () => {
    const plan = { width: 100, height: 80 };
    expect(placePoint({ x: 26, y: 74 }, plan, 25)).toEqual({ x: 25, y: 75 });
    expect(placePoint({ x: 26, y: 74 }, plan, 0)).toEqual({ x: 26, y: 74 });
    expect(placePoint({ x: -5, y: 99 }, plan, 25)).toEqual({ x: 0, y: 80 });
  });

  it('normalises rotation angles', () => {
    expect(normaliseRotation(89.99999999999999)).toBe(90);
    expect(normaliseRotation(-90)).toBe(270);
    expect(normaliseRotation(359.999)).toBe(0);
    expect(normaliseRotation(720)).toBe(0);
  });

  it('moves a placed device and keeps its rotation', () => {
    const next = withPosition(topo, device('a'), { x: 3, y: 4 });
    expect(next.devices[0].position).toMatchObject({ x: 3, y: 4, rotation: 90 });
    expect(topo.devices[0].position.x).toBe(0); // not mutated
  });

  it('places a new device', () => {
    const next = withPosition(topo, device('c'), { x: 1, y: 2 });
    expect(next.devices.map((d) => d.id)).toEqual(['a', 'b', 'c']);
    expect(next.devices[2].position.rotation).toBe(0);
  });

  it('removes a device with its cables', () => {
    const next = withoutDevice(topo, 'b');
    expect(next.devices.map((d) => d.id)).toEqual(['a']);
    expect(next.links).toHaveLength(0);
  });

  it('builds a cable polyline through its waypoints', () => {
    const positions = new Map([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 10, y: 10 }],
    ]);
    expect(linkPoints(topo.links[0], positions)).toEqual([0, 0, 5, 5, 10, 10]);
    expect(linkPoints(topo.links[0], new Map([['a', { x: 0, y: 0 }]]))).toBeNull();
  });
});
