import { isIP } from 'node:net';
import type { DeviceTypeName } from '@physnet/shared';
import type {
  OnosDevice,
  OnosHost,
  OnosLink,
  OnosPort,
  OnosSnapshot,
} from './onos.types.js';

export const HOST_PORT_NUMBER = '0';

export interface MappedDevice {
  onosDeviceId: string;
  name: string;
  deviceType: DeviceTypeName;
  ipAddress: string | null;
  macAddress: string | null;
  status: 'ACTIVE' | 'OFFLINE';
}

export interface MappedPort {
  portNumber: string;
  macAddress: string | null;
  ipAddress: string | null;
  speedMbps: number | null;
  isEnabled: boolean;
}

export interface MappedLink {
  onosLinkId: string;
  a: { onosDeviceId: string; portNumber: string };
  b: { onosDeviceId: string; portNumber: string };
  status: 'ACTIVE' | 'DOWN';
}

export interface MappedTopology {
  devices: Array<MappedDevice & { ports: MappedPort[] }>;
  links: MappedLink[];
}

const MAC_RE = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

export function validIp(value: string | undefined | null): string | null {
  if (!value) return null;
  const ip = value.trim();
  return isIP(ip) ? ip : null;
}

export function validMac(value: string | undefined | null): string | null {
  if (!value) return null;
  const mac = value.trim().toLowerCase();
  return MAC_RE.test(mac) ? mac : null;
}

export function pickIp(values: readonly string[] | undefined): string | null {
  const ips = (values ?? []).map(validIp).filter((ip): ip is string => !!ip);
  return (
    ips.find((ip) => isIP(ip) === 4) ??
    ips.find((ip) => !isLinkLocal(ip)) ??
    ips[0] ??
    null
  );
}

export function isLinkLocal(ip: string): boolean {
  return isIP(ip) === 6 && /^fe[89ab]/i.test(ip);
}

export function mapDeviceType(onosType: string): DeviceTypeName {
  switch (onosType.toUpperCase()) {
    case 'SWITCH':
    case 'FIBER_SWITCH':
    case 'VIRTUAL':
      return 'SWITCH';
    case 'ROUTER':
      return 'ROUTER';
    case 'ACCESS_POINT':
      return 'ACCESS_POINT';
    default:
      return 'OTHER';
  }
}

function managementIp(device: OnosDevice): string | null {
  const a = device.annotations ?? {};
  const explicit = validIp(a['managementAddress']);
  if (explicit) return explicit;
  const channel = a['channelId'];
  if (!channel) return null;
  const host = channel.startsWith('[')
    ? channel.slice(1, channel.indexOf(']'))
    : channel.slice(0, channel.lastIndexOf(':'));
  return validIp(host);
}

function deviceLabel(device: OnosDevice): string {
  const a = device.annotations ?? {};
  const description = a['datapathDescription']?.trim();
  return (
    a['name']?.trim() ||
    (description && description !== 'None' ? description : '') ||
    device.id
  );
}

export function mapDevice(device: OnosDevice): MappedDevice {
  return {
    onosDeviceId: device.id,
    name: deviceLabel(device),
    deviceType: mapDeviceType(device.type),
    ipAddress: managementIp(device),
    macAddress: null,
    status: device.available ? 'ACTIVE' : 'OFFLINE',
  };
}

export function mapPort(port: OnosPort): MappedPort | null {
  if (port.port.toLowerCase() === 'local') return null;
  const speed = Number(port.portSpeed);
  return {
    portNumber: port.port,
    macAddress: validMac(port.annotations?.['portMac']),
    ipAddress: null,
    speedMbps: Number.isFinite(speed) && speed > 0 ? Math.round(speed) : null,
    isEnabled: port.isEnabled,
  };
}

export function mapHost(
  host: OnosHost,
): MappedDevice & { ports: MappedPort[] } {
  const ip = pickIp(host.ipAddresses);
  const mac = validMac(host.mac);
  const label = ip && !isLinkLocal(ip) ? ip : mac;
  return {
    onosDeviceId: host.id,
    name: host.annotations?.['name']?.trim() || label || host.id,
    deviceType: 'HOST',
    ipAddress: ip,
    macAddress: mac,
    status: 'ACTIVE',
    ports: [
      {
        portNumber: HOST_PORT_NUMBER,
        macAddress: mac,
        ipAddress: ip,
        speedMbps: null,
        isEnabled: true,
      },
    ],
  };
}

export function linkId(
  x: { onosDeviceId: string; portNumber: string },
  y: { onosDeviceId: string; portNumber: string },
): string {
  return [
    `${x.onosDeviceId}/${x.portNumber}`,
    `${y.onosDeviceId}/${y.portNumber}`,
  ]
    .sort()
    .join('~');
}

export function mapLinks(links: OnosLink[]): MappedLink[] {
  const byId = new Map<string, MappedLink>();
  for (const l of links) {
    const a = { onosDeviceId: l.src.device, portNumber: l.src.port };
    const b = { onosDeviceId: l.dst.device, portNumber: l.dst.port };
    const id = linkId(a, b);
    const status = l.state?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'DOWN';
    const existing = byId.get(id);
    if (existing) {
      if (status === 'DOWN') existing.status = 'DOWN';
    } else {
      const [first, second] = [a, b].sort((p, q) =>
        `${p.onosDeviceId}/${p.portNumber}`.localeCompare(
          `${q.onosDeviceId}/${q.portNumber}`,
        ),
      );
      byId.set(id, { onosLinkId: id, a: first, b: second, status });
    }
  }
  return [...byId.values()];
}

export function mapHostLinks(hosts: OnosHost[]): MappedLink[] {
  return hosts.flatMap((h) =>
    (h.locations ?? []).map((loc) => {
      const hostEnd = { onosDeviceId: h.id, portNumber: HOST_PORT_NUMBER };
      const switchEnd = { onosDeviceId: loc.elementId, portNumber: loc.port };
      return {
        onosLinkId: linkId(hostEnd, switchEnd),
        a: switchEnd,
        b: hostEnd,
        status: 'ACTIVE' as const,
      };
    }),
  );
}

export function edgeHosts(
  hosts: OnosHost[],
  links: OnosLink[],
  devices: OnosSnapshot['devices'],
): OnosHost[] {
  const infra = new Set(
    links.flatMap((l) => [
      `${l.src.device}/${l.src.port}`,
      `${l.dst.device}/${l.dst.port}`,
    ]),
  );
  const switchMacs = new Set(
    devices
      .flatMap((d) => d.ports.map((p) => validMac(p.annotations?.['portMac'])))
      .filter((mac): mac is string => mac !== null),
  );
  return hosts
    .filter((h) => !switchMacs.has(validMac(h.mac) ?? ''))
    .map((h) => ({
      ...h,
      locations: (h.locations ?? []).filter(
        (loc) => !infra.has(`${loc.elementId}/${loc.port}`),
      ),
    }))
    .filter((h) => h.locations.length > 0);
}

export function mapSnapshot(snapshot: OnosSnapshot): MappedTopology {
  const devices = snapshot.devices.map((d) => ({
    ...mapDevice(d),
    ports: d.ports.map(mapPort).filter((p): p is MappedPort => p !== null),
  }));
  const hosts = edgeHosts(snapshot.hosts, snapshot.links, snapshot.devices);
  return {
    devices: [...devices, ...hosts.map(mapHost)],
    links: [...mapLinks(snapshot.links), ...mapHostLinks(hosts)],
  };
}
