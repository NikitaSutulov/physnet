import type { SystemEvent } from './events.ts';
import type { PlacedDevice, TopologyLink } from './topology.ts';

export const REALTIME_NAMESPACE = '/realtime';

export const SOCKET_ID_HEADER = 'x-socket-id';

export const floorRoom = (floorPlanId: string) => `floor:${floorPlanId}`;
export const DASHBOARD_ROOM = 'dashboard';

export interface FloorEvents {
  'device:moved': { floorPlanId: string; device: PlacedDevice };
  'device:unplaced': { floorPlanId: string; deviceId: string };
  'link:updated': { floorPlanId: string; link: TopologyLink };
  'link:deleted': { floorPlanId: string; linkId: string };
}

export type FloorEventName = keyof FloorEvents;

export type ServerToClientEvents = {
  [E in FloorEventName]: (payload: FloorEvents[E]) => void;
} & {
  'system:event': (event: SystemEvent) => void;
};

export interface ClientToServerEvents {
  'floor:join': (floorPlanId: string, ack: (ok: boolean) => void) => void;
  'floor:leave': (floorPlanId: string) => void;
  'dashboard:join': () => void;
  'dashboard:leave': () => void;
}
