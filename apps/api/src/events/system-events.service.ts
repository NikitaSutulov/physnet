import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { SystemEvent } from '@physnet/shared';

export const SYSTEM_EVENT = 'system.event';

const CAPACITY = 100;

@Injectable()
export class SystemEventsService {
  private readonly buffer: SystemEvent[] = [];

  constructor(private readonly emitter: EventEmitter2) {}

  publish(event: Omit<SystemEvent, 'id' | 'occurredAt'>): SystemEvent {
    const full: SystemEvent = {
      ...event,
      id: randomUUID(),
      occurredAt: new Date().toISOString(),
    };
    this.buffer.push(full);
    if (this.buffer.length > CAPACITY) this.buffer.shift();
    this.emitter.emit(SYSTEM_EVENT, full);
    return full;
  }

  recent(limit = 50): SystemEvent[] {
    return this.buffer.slice(-limit).reverse();
  }
}
