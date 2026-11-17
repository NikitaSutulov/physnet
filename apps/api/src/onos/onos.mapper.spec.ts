import { tree2Snapshot, dpid } from '../../test/fixtures/onos-tree2.js';
import {
  HOST_PORT_NUMBER,
  linkId,
  mapDevice,
  mapDeviceType,
  mapHost,
  mapLinks,
  mapPort,
  mapSnapshot,
  pickIp,
  validIp,
  validMac,
} from './onos.mapper.js';

describe('onos.mapper', () => {
  it('validates IP and MAC values before they reach INET columns', () => {
    expect(validIp(' 10.0.0.1 ')).toBe('10.0.0.1');
    expect(validIp('fe80::1')).toBe('fe80::1');
    expect(validIp('tcp:10.0.0.1')).toBeNull();
    expect(validMac('0A:00:00:00:01:FF')).toBe('0a:00:00:00:01:ff');
    expect(validMac('0a00.0000.01ff')).toBeNull();
  });

  it('maps ONOS device types', () => {
    expect(mapDeviceType('SWITCH')).toBe('SWITCH');
    expect(mapDeviceType('router')).toBe('ROUTER');
    expect(mapDeviceType('ROADM')).toBe('OTHER');
  });

  it('maps a device, falling back to the OpenFlow channel for the IP', () => {
    const d = mapDevice({
      id: dpid(7),
      type: 'SWITCH',
      available: false,
      annotations: { channelId: '192.168.1.20:6653' },
    });
    expect(d).toEqual({
      onosDeviceId: 'of:0000000000000007',
      name: 'of:0000000000000007',
      deviceType: 'SWITCH',
      ipAddress: '192.168.1.20',
      macAddress: null,
      status: 'OFFLINE',
    });
    expect(
      mapDevice({
        id: 'x',
        type: 'SWITCH',
        available: true,
        annotations: { channelId: '[::1]:6653' },
      }).ipAddress,
    ).toBe('::1');
  });

  it('skips the LOCAL port and normalises speed', () => {
    expect(mapPort({ port: 'local', isEnabled: true })).toBeNull();
    expect(
      mapPort({ port: '3', isEnabled: false, portSpeed: 0 }),
    ).toMatchObject({
      portNumber: '3',
      isEnabled: false,
      speedMbps: null,
    });
  });

  it('turns a host into a device with one NIC', () => {
    const h = mapHost({
      id: '00:00:00:00:00:01/None',
      mac: '00:00:00:00:00:01',
      ipAddresses: ['not-an-ip', '10.0.0.1'],
    });
    expect(h).toMatchObject({
      deviceType: 'HOST',
      name: '10.0.0.1',
      ipAddress: '10.0.0.1',
    });
    expect(h.ports).toEqual([
      expect.objectContaining({
        portNumber: HOST_PORT_NUMBER,
        macAddress: '00:00:00:00:00:01',
      }),
    ]);
  });

  it('collapses both directions of a link and marks it down if either is down', () => {
    const a = { device: 'of:1', port: '1' };
    const b = { device: 'of:2', port: '3' };
    const links = mapLinks([
      { src: a, dst: b, type: 'DIRECT', state: 'ACTIVE' },
      { src: b, dst: a, type: 'DIRECT', state: 'INACTIVE' },
    ]);
    expect(links).toHaveLength(1);
    expect(links[0].status).toBe('DOWN');
    expect(links[0].onosLinkId).toBe('of:1/1~of:2/3');
  });

  it('builds an order-independent link id', () => {
    const x = { onosDeviceId: 'of:2', portNumber: '3' };
    const y = { onosDeviceId: 'of:1', portNumber: '1' };
    expect(linkId(x, y)).toBe(linkId(y, x));
  });

  it('maps a whole Mininet tree,2 snapshot', () => {
    const topo = mapSnapshot(tree2Snapshot());
    expect(topo.devices.filter((d) => d.deviceType === 'SWITCH')).toHaveLength(
      3,
    );
    expect(topo.devices.filter((d) => d.deviceType === 'HOST')).toHaveLength(4);
    // s1 has ports 1,2 (LOCAL dropped); s2/s3 have 1..3.
    expect(
      topo.devices
        .find((d) => d.onosDeviceId === dpid(1))
        ?.ports.map((p) => p.portNumber),
    ).toEqual(['1', '2']);
    // 2 switch-switch links + 4 host edges.
    expect(topo.links).toHaveLength(6);
    expect(topo.links.every((l) => l.status === 'ACTIVE')).toBe(true);
  });

  it('prefers IPv4, then routable IPv6, over link-local addresses', () => {
    expect(pickIp(['fe80::1', '2001:db8::1', '10.0.0.1'])).toBe('10.0.0.1');
    expect(pickIp(['fe80::1', '2001:db8::1'])).toBe('2001:db8::1');
    expect(pickIp(['fe80::1'])).toBe('fe80::1');
    expect(pickIp([])).toBeNull();
  });

  it('names a host by its MAC while it only has a link-local address', () => {
    const snapshot = tree2Snapshot();
    const host = {
      ...snapshot.hosts[0],
      ipAddresses: ['fe80::90ea:e3ff:fe67:afa3'],
    };
    const mapped = mapHost(host);
    expect(mapped.ipAddress).toBe('fe80::90ea:e3ff:fe67:afa3');
    expect(mapped.name).toBe(mapped.macAddress);
  });

  it('names a switch after its Mininet datapath description', () => {
    const [s1] = tree2Snapshot().devices;
    expect(
      mapDevice({
        ...s1,
        annotations: { ...s1.annotations, datapathDescription: 's1' },
      }).name,
    ).toBe('s1');
    expect(
      mapDevice({
        ...s1,
        annotations: { ...s1.annotations, datapathDescription: 'None' },
      }).name,
    ).toBe(s1.id);
  });

  it('ignores phantom hosts seen on switch-to-switch ports', () => {
    const snapshot = tree2Snapshot();
    const infra = snapshot.links[0].src;
    snapshot.hosts.push({
      ...snapshot.hosts[0],
      id: '92:EA:E3:67:AF:A3/None',
      mac: '92:EA:E3:67:AF:A3',
      locations: [{ elementId: infra.device, port: infra.port }],
    });
    const topo = mapSnapshot(snapshot);
    expect(topo.devices.filter((d) => d.deviceType === 'HOST')).toHaveLength(4);
    expect(topo.links).toHaveLength(6);
  });

  it('ignores phantom hosts carrying a switch port MAC', () => {
    const snapshot = tree2Snapshot();
    // Link discovery has not run yet, so nothing is known as infrastructure.
    snapshot.links = [];
    const [s1] = snapshot.devices;
    s1.ports[0].annotations = { portMac: 'DA:1B:14:81:79:BC' };
    snapshot.hosts.push({
      ...snapshot.hosts[0],
      id: 'DA:1B:14:81:79:BC/None',
      mac: 'DA:1B:14:81:79:BC',
    });
    const hosts = mapSnapshot(snapshot).devices.filter(
      (d) => d.deviceType === 'HOST',
    );
    expect(hosts).toHaveLength(4);
  });
});
