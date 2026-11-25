import type { RoutingPolicy } from './entities.ts';

export const INTENT_TYPES = ['HostToHostIntent', 'PointToPointIntent'] as const;
export type IntentType = (typeof INTENT_TYPES)[number];

export const IP_PROTOCOLS = ['TCP', 'UDP', 'ICMP'] as const;
export type IpProtocol = (typeof IP_PROTOCOLS)[number];

export const DEFAULT_INTENT_PRIORITY = 100;

export interface ConnectPoint {
  device: string;
  port: string;
}

export interface TrafficSelector {
  ipSrc?: string;
  ipDst?: string;
  protocol?: IpProtocol;
  dstPort?: number;
}

export interface HostToHostPayload {
  type: 'HostToHostIntent';
  one: string;
  two: string;
  priority: number;
}

export interface PointToPointPayload {
  type: 'PointToPointIntent';
  ingressPoint: ConnectPoint;
  egressPoint: ConnectPoint;
  selector?: TrafficSelector;
  priority: number;
}

export type PolicyPayload = HostToHostPayload | PointToPointPayload;

export type IntentState =
  | 'INSTALLED'
  | 'INSTALLING'
  | 'COMPILING'
  | 'RECOMPILING'
  | 'WITHDRAWING'
  | 'WITHDRAWN'
  | 'FAILED'
  | 'CORRUPT'
  | 'NOT_APPLIED'
  | 'MISSING'
  | 'UNKNOWN';

export interface RoutingPolicyResponse extends Omit<RoutingPolicy, 'payload' | 'intentType'> {
  intentType: IntentType;
  payload: PolicyPayload;
  creator: { firstName: string; lastName: string };
  state: IntentState;
}

export interface CreatePolicyRequest {
  name: string;
  payload: PolicyPayload;
}

export type UpdatePolicyRequest = Partial<CreatePolicyRequest>;

export interface UpdatePortRequest {
  isEnabled: boolean;
}
