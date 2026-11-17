/**
 * ONOS REST payloads for a Mininet `--topo tree,2` network:
 *   s1 is the root, s2 and s3 hang off its ports 1 and 2;
 *   h1, h2 sit on s2 and h3, h4 on s3.
 * Shapes follow ONOS 2.x JSON codecs (onos/v1/devices, /ports, /links, /hosts).
 */
import type {
  OnosHost,
  OnosLink,
  OnosPort,
  OnosSnapshot,
} from '../../src/onos/onos.types.js';

export interface FixtureIds {
  /** Prefix of switch ids; Mininet/ONOS use "of:". */
  dpidPrefix: string;
  /** First five MAC octets of hosts. */
  macPrefix: string;
}

export const DEFAULT_IDS: FixtureIds = {
  dpidPrefix: 'of:',
  macPrefix: '00:00:00:00:00',
};

export const dpid = (n: number, prefix = DEFAULT_IDS.dpidPrefix) =>
  `${prefix}${n.toString(16).padStart(16, '0')}`;

export const hostMac = (n: number, prefix = DEFAULT_IDS.macPrefix) =>
  `${prefix}:0${n}`.toUpperCase();

export const hostId = (n: number, prefix = DEFAULT_IDS.macPrefix) =>
  `${hostMac(n, prefix)}/None`;

export function tree2Snapshot(ids: FixtureIds = DEFAULT_IDS): OnosSnapshot {
  const sid = (n: number) => dpid(n, ids.dpidPrefix);

  const port = (n: string, mac: string): OnosPort => ({
    port: n,
    isEnabled: true,
    type: 'copper',
    portSpeed: 10000,
    annotations: { portMac: mac, portName: `eth${n}`, adminState: 'enabled' },
  });

  const sw = (n: number, portCount: number) => ({
    id: sid(n),
    type: 'SWITCH',
    available: true,
    role: 'MASTER',
    mfr: 'Nicira, Inc.',
    hw: 'Open vSwitch',
    sw: '2.17.9',
    serial: 'None',
    driver: 'ovs',
    chassisId: n.toString(16),
    annotations: {
      channelId: `172.17.0.1:${40000 + n}`,
      managementAddress: '172.17.0.1',
      protocol: 'OF_13',
    },
    ports: [
      { port: 'local', isEnabled: false, type: 'copper', portSpeed: 0 },
      ...Array.from({ length: portCount }, (_, i) =>
        port(String(i + 1), `0a:00:00:00:0${n}:0${i + 1}`),
      ),
    ],
  });

  const link = (a: [number, string], b: [number, string]): OnosLink[] => [
    {
      src: { device: sid(a[0]), port: a[1] },
      dst: { device: sid(b[0]), port: b[1] },
      type: 'DIRECT',
      state: 'ACTIVE',
    },
    {
      src: { device: sid(b[0]), port: b[1] },
      dst: { device: sid(a[0]), port: a[1] },
      type: 'DIRECT',
      state: 'ACTIVE',
    },
  ];

  const host = (n: number, swNo: number, swPort: string): OnosHost => ({
    id: hostId(n, ids.macPrefix),
    mac: hostMac(n, ids.macPrefix),
    vlan: 'None',
    ipAddresses: [`10.0.0.${n}`],
    locations: [{ elementId: sid(swNo), port: swPort }],
    configured: false,
  });

  return {
    devices: [sw(1, 2), sw(2, 3), sw(3, 3)],
    links: [...link([1, '1'], [2, '3']), ...link([1, '2'], [3, '3'])],
    hosts: [host(1, 2, '1'), host(2, 2, '2'), host(3, 3, '1'), host(4, 3, '2')],
  };
}
