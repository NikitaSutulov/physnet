import type { SystemEvent, TopologyResponse } from '@physnet/shared';

export const REFETCH = 'refetch';

export function applySystemEvent(
  topology: TopologyResponse,
  event: SystemEvent,
): TopologyResponse | typeof REFETCH {
  const data = event.data ?? {};
  switch (event.type) {
    case 'device.status': {
      const to = data['to'];
      if (typeof to !== 'string' || !event.deviceId) return topology;
      return {
        ...topology,
        devices: topology.devices.map((d) => (d.id === event.deviceId ? { ...d, status: to } : d)),
      };
    }
    case 'port.status': {
      const isEnabled = data['isEnabled'];
      if (typeof isEnabled !== 'boolean' || !event.portId) return topology;
      return {
        ...topology,
        devices: topology.devices.map((d) =>
          d.id === event.deviceId
            ? { ...d, ports: d.ports.map((p) => (p.id === event.portId ? { ...p, isEnabled } : p)) }
            : d,
        ),
      };
    }
    case 'link.status': {
      const to = data['to'];
      if (typeof to !== 'string' || !event.linkId) return topology;
      return {
        ...topology,
        links: topology.links.map((l) => (l.id === event.linkId ? { ...l, status: to } : l)),
      };
    }
    case 'link.created':
    case 'device.removed':
      return REFETCH;
    default:
      return topology;
  }
}
