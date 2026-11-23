import { describe, expect, it } from 'vitest';
import type { PlacedDevice, SystemEvent, TopologyResponse } from '@physnet/shared';
import { applySystemEvent, REFETCH } from './realtime';

const device: PlacedDevice = {
  id: 'd1',
  onosDeviceId: 'of:1',
  name: 's1',
  deviceType: 'SWITCH',
  ipAddress: null,
  macAddress: null,
  status: 'ACTIVE',
  createdAt: '',
  updatedAt: '',
  ports: [
    {
      id: 'p1',
      deviceId: 'd1',
      portNumber: '1',
      macAddress: null,
      ipAddress: null,
      speedMbps: null,
      isEnabled: true,
      createdAt: '',
    },
  ],
  position: { x: 0, y: 0, rotation: 0, updatedAt: '' },
};

const topo: TopologyResponse = {
  floorPlanId: 'plan',
  devices: [device],
  links: [
    {
      id: 'l1',
      onosLinkId: 'x',
      floorPlanId: 'plan',
      source: { portId: 'p1', portNumber: '1', deviceId: 'd1' },
      destination: { portId: 'p2', portNumber: '1', deviceId: 'd2' },
      waypoints: [],
      cableType: 'COPPER',
      status: 'ACTIVE',
    },
  ],
};

const event = (e: Partial<SystemEvent>): SystemEvent => ({
  id: 'e',
  type: 'device.status',
  severity: 'info',
  message: '',
  occurredAt: '',
  ...e,
});

describe('applySystemEvent', () => {
  it('patches device, port and link status in place', () => {
    const offline = applySystemEvent(
      topo,
      event({ type: 'device.status', deviceId: 'd1', data: { from: 'ACTIVE', to: 'OFFLINE' } }),
    );
    expect(offline).not.toBe(REFETCH);
    expect((offline as TopologyResponse).devices[0].status).toBe('OFFLINE');

    const portDown = applySystemEvent(
      topo,
      event({ type: 'port.status', deviceId: 'd1', portId: 'p1', data: { isEnabled: false } }),
    ) as TopologyResponse;
    expect(portDown.devices[0].ports[0].isEnabled).toBe(false);

    const linkDown = applySystemEvent(
      topo,
      event({ type: 'link.status', linkId: 'l1', data: { to: 'DOWN' } }),
    ) as TopologyResponse;
    expect(linkDown.links[0].status).toBe('DOWN');
    expect(topo.links[0].status).toBe('ACTIVE'); // not mutated
  });

  it('asks for a refetch on structural changes', () => {
    expect(applySystemEvent(topo, event({ type: 'link.created' }))).toBe(REFETCH);
    expect(applySystemEvent(topo, event({ type: 'device.removed' }))).toBe(REFETCH);
  });

  it('ignores unrelated or malformed events', () => {
    expect(applySystemEvent(topo, event({ type: 'controller.status' }))).toBe(topo);
    expect(applySystemEvent(topo, event({ type: 'device.status', deviceId: 'd1' }))).toBe(topo);
  });
});
