import type {
  IpProtocol,
  PolicyPayload,
  TrafficSelector,
} from '@physnet/shared';

export type OnosCriterion =
  | { type: 'ETH_TYPE'; ethType: string }
  | { type: 'IPV4_SRC' | 'IPV4_DST'; ip: string }
  | { type: 'IP_PROTO'; protocol: number }
  | { type: 'TCP_DST'; tcpPort: number }
  | { type: 'UDP_DST'; udpPort: number };

const IP_PROTO: Record<IpProtocol, number> = { ICMP: 1, TCP: 6, UDP: 17 };
const ETH_TYPE_IPV4 = '0x0800';

export function toCidr(ip: string): string {
  return ip.includes('/') ? ip : `${ip}/32`;
}

export function toCriteria(
  selector: TrafficSelector | undefined,
): OnosCriterion[] {
  if (!selector) return [];
  const { ipSrc, ipDst, protocol, dstPort } = selector;
  const criteria: OnosCriterion[] = [];
  if (ipSrc) criteria.push({ type: 'IPV4_SRC', ip: toCidr(ipSrc) });
  if (ipDst) criteria.push({ type: 'IPV4_DST', ip: toCidr(ipDst) });
  if (protocol) {
    criteria.push({ type: 'IP_PROTO', protocol: IP_PROTO[protocol] });
    if (dstPort && protocol === 'TCP')
      criteria.push({ type: 'TCP_DST', tcpPort: dstPort });
    if (dstPort && protocol === 'UDP')
      criteria.push({ type: 'UDP_DST', udpPort: dstPort });
  }
  return criteria.length
    ? [{ type: 'ETH_TYPE', ethType: ETH_TYPE_IPV4 }, ...criteria]
    : [];
}

export function toOnosIntent(
  payload: PolicyPayload,
  appId: string,
  key: string,
): Record<string, unknown> {
  if (payload.type === 'HostToHostIntent') {
    const { type, one, two, priority } = payload;
    return { type, appId, key, priority, one, two };
  }
  const { type, ingressPoint, egressPoint, priority, selector } = payload;
  const criteria = toCriteria(selector);
  return {
    type,
    appId,
    key,
    priority,
    ingressPoint,
    egressPoint,
    ...(criteria.length > 0 && { selector: { criteria } }),
  };
}

export function policyIntentKey(policyId: string): string {
  return `physnet-${policyId}`;
}
