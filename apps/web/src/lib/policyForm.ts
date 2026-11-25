import { z } from 'zod';
import {
  DEFAULT_INTENT_PRIORITY,
  INTENT_TYPES,
  IP_PROTOCOLS,
  type CreatePolicyRequest,
  type RoutingPolicyResponse,
  type TrafficSelector,
} from '@physnet/shared';

const OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4_CIDR = new RegExp(`^(${OCTET}\\.){3}${OCTET}(/(3[0-2]|[12]?\\d))?$`);

const optionalCidr = z
  .string()
  .trim()
  .refine((v) => !v || IPV4_CIDR.test(v), 'IPv4-адреса або підмережа, напр. 10.0.0.0/24');

export const policyFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Вкажіть назву').max(255),
    type: z.enum(INTENT_TYPES),
    priority: z.coerce
      .number<string>('Число')
      .int('Ціле число')
      .min(1, 'Від 1')
      .max(65535, 'До 65535'),
    one: z.string(),
    two: z.string(),
    ingressDevice: z.string(),
    ingressPort: z.string(),
    egressDevice: z.string(),
    egressPort: z.string(),
    ipSrc: optionalCidr,
    ipDst: optionalCidr,
    protocol: z.enum(['', ...IP_PROTOCOLS]),
    dstPort: z
      .string()
      .trim()
      .refine((v) => !v || (/^\d+$/.test(v) && +v >= 1 && +v <= 65535), 'Порт 1–65535'),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    if (v.type === 'HostToHostIntent') {
      if (!v.one) issue('one', 'Оберіть хост');
      if (!v.two) issue('two', 'Оберіть хост');
      if (v.one && v.one === v.two) issue('two', 'Оберіть інший хост');
      return;
    }
    if (!v.ingressDevice) issue('ingressDevice', 'Оберіть комутатор');
    if (!v.ingressPort) issue('ingressPort', 'Оберіть порт');
    if (!v.egressDevice) issue('egressDevice', 'Оберіть комутатор');
    if (!v.egressPort) issue('egressPort', 'Оберіть порт');
    if (
      v.ingressDevice &&
      v.ingressDevice === v.egressDevice &&
      v.ingressPort &&
      v.ingressPort === v.egressPort
    ) {
      issue('egressPort', 'Вихід має відрізнятися від входу');
    }
    if (v.dstPort && v.protocol !== 'TCP' && v.protocol !== 'UDP') {
      issue('dstPort', 'Порт призначення — лише для TCP або UDP');
    }
  });

export type PolicyFormInput = z.input<typeof policyFormSchema>;
export type PolicyFormValues = z.output<typeof policyFormSchema>;

/** Validated form → API request (only the fields of the chosen type). */
export function toPolicyRequest(v: PolicyFormValues): CreatePolicyRequest {
  if (v.type === 'HostToHostIntent') {
    return {
      name: v.name,
      payload: { type: v.type, one: v.one, two: v.two, priority: v.priority },
    };
  }
  const selector: TrafficSelector = {
    ...(v.ipSrc && { ipSrc: v.ipSrc }),
    ...(v.ipDst && { ipDst: v.ipDst }),
    ...(v.protocol && { protocol: v.protocol }),
    ...(v.dstPort && { dstPort: Number(v.dstPort) }),
  };
  return {
    name: v.name,
    payload: {
      type: v.type,
      ingressPoint: { device: v.ingressDevice, port: v.ingressPort },
      egressPoint: { device: v.egressDevice, port: v.egressPort },
      ...(Object.keys(selector).length > 0 && { selector }),
      priority: v.priority,
    },
  };
}

/** Form defaults: empty, or filled from a policy being edited. */
export function toFormInput(policy?: RoutingPolicyResponse): PolicyFormInput {
  const empty: PolicyFormInput = {
    name: '',
    type: 'HostToHostIntent',
    priority: String(DEFAULT_INTENT_PRIORITY),
    one: '',
    two: '',
    ingressDevice: '',
    ingressPort: '',
    egressDevice: '',
    egressPort: '',
    ipSrc: '',
    ipDst: '',
    protocol: '',
    dstPort: '',
  };
  if (!policy) return empty;
  const p = policy.payload;
  const base = { ...empty, name: policy.name, type: p.type, priority: String(p.priority) };
  if (p.type === 'HostToHostIntent') return { ...base, one: p.one, two: p.two };
  return {
    ...base,
    ingressDevice: p.ingressPoint.device,
    ingressPort: p.ingressPoint.port,
    egressDevice: p.egressPoint.device,
    egressPort: p.egressPoint.port,
    ipSrc: p.selector?.ipSrc ?? '',
    ipDst: p.selector?.ipDst ?? '',
    protocol: p.selector?.protocol ?? '',
    dstPort: p.selector?.dstPort ? String(p.selector.dstPort) : '',
  };
}
