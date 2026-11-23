import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { FloorEventName, FloorEvents } from '@physnet/shared';

export const FLOOR_EVENT = 'realtime.floor';

export type FloorEventEnvelope = {
  [E in FloorEventName]: {
    event: E;
    payload: FloorEvents[E];
    origin?: string;
  };
}[FloorEventName];

@Injectable()
export class TopologyEventsService {
  constructor(private readonly emitter: EventEmitter2) {}

  deviceMoved(payload: FloorEvents['device:moved'], origin?: string) {
    this.emit({ event: 'device:moved', payload, origin });
  }

  deviceUnplaced(payload: FloorEvents['device:unplaced'], origin?: string) {
    this.emit({ event: 'device:unplaced', payload, origin });
  }

  linkUpdated(payload: FloorEvents['link:updated'], origin?: string) {
    this.emit({ event: 'link:updated', payload, origin });
  }

  linkDeleted(payload: FloorEvents['link:deleted'], origin?: string) {
    this.emit({ event: 'link:deleted', payload, origin });
  }

  private emit(envelope: FloorEventEnvelope) {
    this.emitter.emit(FLOOR_EVENT, envelope);
  }
}
