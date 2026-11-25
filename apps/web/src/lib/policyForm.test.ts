import { describe, expect, it } from 'vitest';
import type { RoutingPolicyResponse } from '@physnet/shared';
import { policyFormSchema, toFormInput, toPolicyRequest, type PolicyFormInput } from './policyForm';

const base = toFormInput();
const parse = (v: Partial<PolicyFormInput>) =>
  policyFormSchema.safeParse({ ...base, name: 'p', ...v });
const errors = (v: Partial<PolicyFormInput>) => {
  const r = parse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
};

describe('policy form', () => {
  it('requires two different hosts for host-to-host', () => {
    expect(Object.keys(errors({}))).toEqual(['one', 'two']);
    expect(errors({ one: 'A/None', two: 'A/None' })).toEqual({ two: 'Оберіть інший хост' });
    expect(parse({ one: 'A/None', two: 'B/None' }).success).toBe(true);
  });

  it('validates point-to-point ports and the selector', () => {
    const p2p: Partial<PolicyFormInput> = {
      type: 'PointToPointIntent',
      ingressDevice: 'of:1',
      ingressPort: '1',
      egressDevice: 'of:1',
      egressPort: '1',
    };
    expect(errors(p2p)).toEqual({ egressPort: 'Вихід має відрізнятися від входу' });
    const ok = { ...p2p, egressPort: '2' };
    expect(parse(ok).success).toBe(true);
    expect(Object.keys(errors({ ...ok, ipSrc: '10.0.0.256' }))).toEqual(['ipSrc']);
    expect(Object.keys(errors({ ...ok, ipDst: '10.0.0.0/33' }))).toEqual(['ipDst']);
    expect(parse({ ...ok, ipDst: '10.0.0.0/24' }).success).toBe(true);
    expect(Object.keys(errors({ ...ok, dstPort: '80' }))).toEqual(['dstPort']); // no protocol
    expect(Object.keys(errors({ ...ok, protocol: 'TCP', dstPort: '70000' }))).toEqual(['dstPort']);
    expect(Object.keys(errors({ ...ok, priority: '0' }))).toEqual(['priority']);
  });

  it('builds requests with only the fields of the chosen type', () => {
    const r = policyFormSchema.parse({
      ...base,
      name: ' web ',
      type: 'PointToPointIntent',
      priority: '200',
      one: 'left over',
      ingressDevice: 'of:1',
      ingressPort: '1',
      egressDevice: 'of:2',
      egressPort: '3',
      protocol: 'TCP',
      dstPort: '80',
    });
    expect(toPolicyRequest(r)).toEqual({
      name: 'web',
      payload: {
        type: 'PointToPointIntent',
        ingressPoint: { device: 'of:1', port: '1' },
        egressPoint: { device: 'of:2', port: '3' },
        selector: { protocol: 'TCP', dstPort: 80 },
        priority: 200,
      },
    });
  });

  it('round-trips a stored policy through the form', () => {
    const policy = {
      name: 'web',
      payload: {
        type: 'PointToPointIntent',
        ingressPoint: { device: 'of:1', port: '1' },
        egressPoint: { device: 'of:2', port: '3' },
        selector: { ipSrc: '10.0.0.1', protocol: 'UDP', dstPort: 53 },
        priority: 150,
      },
    } as RoutingPolicyResponse;
    const values = policyFormSchema.parse(toFormInput(policy));
    expect(toPolicyRequest(values)).toEqual({ name: policy.name, payload: policy.payload });
  });
});
