import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { SchedulerRegistry } from '@nestjs/schedule';
import type { Env } from '../config/env.js';
import type { SystemEventsService } from '../events/system-events.service.js';
import type { OnosService } from '../onos/onos.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { TopologySyncService } from './topology-sync.service.js';

/**
 * Run coordination only: every snapshot request is a promise the test
 * settles by hand (as an unreachable controller, so no database is needed).
 */
describe('TopologySyncService.requestSync', () => {
  let pending: Array<() => void>;
  let service: TopologySyncService;

  const settleNext = async () => {
    const fail = pending.shift();
    expect(fail).toBeDefined();
    fail!();
    // Let the run's promise chain (and any queued follow-up) proceed.
    await new Promise((r) => setImmediate(r));
  };

  beforeEach(() => {
    pending = [];
    const onos = {
      getSnapshot: () =>
        new Promise((_, reject) =>
          pending.push(() => reject(new ServiceUnavailableException('down'))),
        ),
    } as unknown as OnosService;
    const config = {
      get: (key: keyof Env) =>
        ({ ONOS_SYNC_ENABLED: true, ONOS_POLL_INTERVAL_MS: 5000 })[
          key as string
        ],
    } as unknown as ConfigService<Env, true>;
    service = new TopologySyncService(
      {} as PrismaService,
      onos,
      { publish: () => undefined } as unknown as SystemEventsService,
      {} as SchedulerRegistry,
      config,
    );
  });

  it('starts a run when idle and resolves when it ends', async () => {
    let done = false;
    void service.requestSync().then(() => (done = true));
    expect(pending).toHaveLength(1);
    await settleNext();
    expect(done).toBe(true);
  });

  it('queues one more run behind a run in progress', async () => {
    void service.syncSafely(); // e.g. the periodic tick, run A
    let done = 0;
    const first = service.requestSync().then(() => done++);
    const second = service.requestSync().then(() => done++);
    expect(pending).toHaveLength(1); // nothing new yet

    await settleNext(); // A ends: it may have missed the new placement
    expect(done).toBe(0);
    expect(pending).toHaveLength(1); // run B started, shared by both callers

    await settleNext();
    await Promise.all([first, second]);
    expect(done).toBe(2);
    expect(pending).toHaveLength(0);
  });

  it('lets the periodic tick join a run instead of starting another', async () => {
    void service.syncSafely();
    void service.syncSafely();
    expect(pending).toHaveLength(1);
    expect(service.getStatus().running).toBe(true);
    await settleNext();
    expect(service.getStatus().running).toBe(false);
  });
});
