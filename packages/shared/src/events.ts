export const SYSTEM_EVENT_TYPES = [
  'device.discovered',
  'device.status',
  'device.removed',
  'port.status',
  'link.status',
  'link.created',
  'controller.status',
  'policy.status',
] as const;

export type SystemEventType = (typeof SYSTEM_EVENT_TYPES)[number];

export type SystemEventSeverity = 'info' | 'warning' | 'critical';

export interface SystemEvent {
  id: string;
  type: SystemEventType;
  severity: SystemEventSeverity;
  message: string;
  occurredAt: string;
  deviceId?: string;
  portId?: string;
  linkId?: string;
  floorPlanIds?: string[];
  data?: Record<string, unknown>;
}
