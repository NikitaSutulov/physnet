import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import {
  REALTIME_NAMESPACE,
  SOCKET_ID_HEADER,
  type FloorEvents,
  type SystemEvent,
  type TopologyLink,
} from '@physnet/shared';
import type { SystemEventsService } from '../src/events/system-events.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';

/**
 * Two browsers on one plan, against a real HTTP server and the development
 * database. Test data uses the `e2e-rt:` namespace and is removed afterwards.
 * Requires `pnpm infra:up` and `pnpm db:seed`.
 */
const PREFIX = 'e2e-rt:';
const PLAN_TITLE = 'e2e realtime plan';

/** Payloads the test listens for, by event name. */
type Payloads = FloorEvents & { 'system:event': SystemEvent };

/** Resolves with the next `event`, or rejects after `ms`. */
function next<E extends keyof Payloads>(
  socket: Socket,
  event: E,
  ms = 2000,
): Promise<Payloads[E]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${event}`)), ms);
    const name: string = event; // socket.io-client: untyped events
    socket.once(name, (payload: Payloads[E]) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** Collects `event` payloads, to assert that nothing arrived. */
function record<E extends keyof Payloads>(socket: Socket, event: E) {
  const seen: Payloads[E][] = [];
  const name: string = event;
  socket.on(name, (payload: Payloads[E]) => seen.push(payload));
  return seen;
}

describe('Realtime (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let url: string;
  let token: string;
  let planId: string;
  let ports: { a: string; b: string };
  let deviceIds: string[];
  let alice: Socket;
  let bob: Socket;
  const auth = { Authorization: '' };
  const http = () => request(app.getHttpServer());

  const connect = (authToken?: string) =>
    new Promise<Socket>((resolve, reject) => {
      const socket = io(`${url}${REALTIME_NAMESPACE}`, {
        auth: authToken ? { token: authToken } : {},
        transports: ['websocket'],
        reconnection: false,
      });
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });

  beforeAll(async () => {
    process.env['ONOS_SYNC_ENABLED'] = 'false';
    const { AppModule } = await import('../src/app.module.js');
    const { PrismaService } = await import('../src/prisma/prisma.service.js');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
    prisma = app.get(PrismaService);

    const login = await http()
      .post('/api/auth/login')
      .send({
        email: process.env['SEED_ADMIN_EMAIL'] ?? 'admin@physnet.local',
        password: process.env['SEED_ADMIN_PASSWORD'] ?? 'changeme123',
      })
      .expect(200);
    const body = login.body as { accessToken: string; user: { id: string } };
    token = body.accessToken;
    auth.Authorization = `Bearer ${token}`;

    await cleanup();
    planId = (
      await prisma.floorPlan.create({
        data: {
          title: PLAN_TITLE,
          imageUrl: 'e2e/none.png',
          width: 1000,
          height: 800,
          createdBy: body.user.id,
        },
      })
    ).id;
    const devices = await Promise.all(
      [1, 2].map((n) =>
        prisma.networkDevice.create({
          data: {
            onosDeviceId: `${PREFIX}${n}`,
            name: `rt-${n}`,
            deviceType: 'SWITCH',
            ports: { create: [{ portNumber: '1' }] },
            spatialCoordinates: {
              create: { floorPlanId: planId, x: 10, y: 10 },
            },
          },
          include: { ports: true },
        }),
      ),
    );
    deviceIds = devices.map((d) => d.id);
    ports = { a: devices[0].ports[0].id, b: devices[1].ports[0].id };

    [alice, bob] = await Promise.all([connect(token), connect(token)]);
  });

  async function cleanup() {
    await prisma.networkDevice.deleteMany({
      where: { onosDeviceId: { startsWith: PREFIX } },
    });
    await prisma.floorPlan.deleteMany({ where: { title: PLAN_TITLE } });
  }

  afterAll(async () => {
    alice?.disconnect();
    bob?.disconnect();
    if (prisma) await cleanup();
    await app?.close();
  });

  it('rejects a handshake without a valid token', async () => {
    await expect(connect()).rejects.toThrow('Unauthorized');
    await expect(connect('not-a-jwt')).rejects.toThrow('Unauthorized');
  });

  it('joins a floor plan room', async () => {
    expect(await alice.emitWithAck('floor:join', planId)).toBe(true);
    expect(await bob.emitWithAck('floor:join', planId)).toBe(true);
    expect(await bob.emitWithAck('floor:join', 'nope')).toBe(false);
  });

  it('sends a move to the other clients but not back to its author', async () => {
    const echoes = record(alice, 'device:moved');
    const received = next(bob, 'device:moved');
    await http()
      .put(`/api/floor-plans/${planId}/devices/${deviceIds[0]}/position`)
      .set(auth)
      .set(SOCKET_ID_HEADER, alice.id!)
      .send({ x: 300, y: 200 })
      .expect(200);

    const event = await received;
    expect(event).toMatchObject({
      floorPlanId: planId,
      device: { id: deviceIds[0], position: { x: 300, y: 200 } },
    });
    await new Promise((r) => setTimeout(r, 200));
    expect(echoes).toHaveLength(0);
  });

  it('announces cable changes and unplaced devices', async () => {
    const created = next(bob, 'link:updated');
    const link = (
      await http()
        .post(`/api/floor-plans/${planId}/links`)
        .set(auth)
        .send({ sourcePortId: ports.a, destinationPortId: ports.b })
        .expect(201)
    ).body as TopologyLink;
    expect((await created).link.id).toBe(link.id);

    const deleted = next(bob, 'link:deleted');
    await http().delete(`/api/links/${link.id}`).set(auth).expect(204);
    expect(await deleted).toEqual({ floorPlanId: planId, linkId: link.id });

    const unplaced = next(alice, 'device:unplaced');
    await http()
      .delete(`/api/floor-plans/${planId}/devices/${deviceIds[1]}/position`)
      .set(auth)
      .expect(204);
    expect(await unplaced).toEqual({
      floorPlanId: planId,
      deviceId: deviceIds[1],
    });
  });

  it('routes system events to the dashboard and to affected plans', async () => {
    const { SystemEventsService } =
      await import('../src/events/system-events.service.js');
    const events = app.get<SystemEventsService>(SystemEventsService);
    bob.emit('dashboard:join');
    await alice.emitWithAck('floor:join', planId); // round trip: join is processed

    const onPlan = next(alice, 'system:event');
    const onDashboard = next(bob, 'system:event');
    const published = events.publish({
      type: 'link.status',
      severity: 'warning',
      message: 'test',
      floorPlanIds: [planId],
    });
    expect((await onPlan).id).toBe(published.id);
    expect((await onDashboard).id).toBe(published.id);

    // Joining another plan leaves this one: its events no longer arrive.
    await alice.emitWithAck(
      'floor:join',
      '00000000-0000-4000-8000-000000000000',
    );
    const missed = record(alice, 'system:event');
    const stillOnDashboard = next(bob, 'system:event');
    events.publish({
      type: 'link.status',
      severity: 'warning',
      message: 'test 2',
      floorPlanIds: [planId],
    });
    await stillOnDashboard;
    await new Promise((r) => setTimeout(r, 200));
    expect(missed).toHaveLength(0);
  });
});
