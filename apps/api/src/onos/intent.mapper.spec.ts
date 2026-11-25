import {
  policyIntentKey,
  toCidr,
  toCriteria,
  toOnosIntent,
} from './intent.mapper.js';

describe('intent.mapper', () => {
  it('turns a readable selector into ONOS criteria', () => {
    expect(toCriteria(undefined)).toEqual([]);
    expect(toCriteria({})).toEqual([]);
    expect(
      toCriteria({
        ipSrc: '10.0.0.1',
        ipDst: '10.0.0.0/24',
        protocol: 'TCP',
        dstPort: 80,
      }),
    ).toEqual([
      { type: 'ETH_TYPE', ethType: '0x0800' },
      { type: 'IPV4_SRC', ip: '10.0.0.1/32' },
      { type: 'IPV4_DST', ip: '10.0.0.0/24' },
      { type: 'IP_PROTO', protocol: 6 },
      { type: 'TCP_DST', tcpPort: 80 },
    ]);
    expect(toCriteria({ protocol: 'UDP', dstPort: 53 })).toContainEqual({
      type: 'UDP_DST',
      udpPort: 53,
    });
    // A port without TCP/UDP means nothing to ONOS and is dropped.
    expect(toCriteria({ protocol: 'ICMP', dstPort: 7 })).toEqual([
      { type: 'ETH_TYPE', ethType: '0x0800' },
      { type: 'IP_PROTO', protocol: 1 },
    ]);
    expect(toCidr('10.0.0.0/8')).toBe('10.0.0.0/8');
  });

  it('builds intent bodies for both intent types', () => {
    expect(
      toOnosIntent(
        {
          type: 'HostToHostIntent',
          one: 'AA:BB:CC:DD:EE:01/None',
          two: 'AA:BB:CC:DD:EE:02/None',
          priority: 100,
        },
        'org.onosproject.physnet',
        'k1',
      ),
    ).toEqual({
      type: 'HostToHostIntent',
      appId: 'org.onosproject.physnet',
      key: 'k1',
      priority: 100,
      one: 'AA:BB:CC:DD:EE:01/None',
      two: 'AA:BB:CC:DD:EE:02/None',
    });

    const p2p = toOnosIntent(
      {
        type: 'PointToPointIntent',
        ingressPoint: { device: 'of:1', port: '1' },
        egressPoint: { device: 'of:2', port: '3' },
        priority: 200,
      },
      'app',
      'k2',
    );
    expect(p2p).toEqual({
      type: 'PointToPointIntent',
      appId: 'app',
      key: 'k2',
      priority: 200,
      ingressPoint: { device: 'of:1', port: '1' },
      egressPoint: { device: 'of:2', port: '3' },
    });
  });

  it('names intents after their policy', () => {
    expect(policyIntentKey('42')).toBe('physnet-42');
  });
});
