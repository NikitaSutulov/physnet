import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type {
  NetworkDeviceWithPorts,
  OfflineDevicesSummary,
  SyncStatus,
  SyncSummary,
  SystemEvent,
} from '@physnet/shared';
import { HOST_PORT_NUMBER, linkId } from '../src/onos/onos.mapper.js';
import type { OnosSnapshot } from '../src/onos/onos.types.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import {
  dpid,
  hostId,
  tree2Snapshot,
  type FixtureIds,
} from './fixtures/onos-tree2.js';

/**
 * Runs the ONOS synchroniser against a fake controller over real HTTP and
 * the development database. Test data uses its own id namespace and is
 * removed afterwards. Requires `pnpm infra:up` and `pnpm db:seed`.
 */
const IDS: FixtureIds = { dpidPrefix: 'e2e:', macPrefix: 'ee:ee:ee:ee:ee' };
const S = (n: number) => dpid(n, IDS.dpidPrefix);
const H = (n: number) => hostId(n, IDS.macPrefix);
const end = (onosDeviceId: string, portNumber: string) => ({
  onosDeviceId,
  portNumber,
});
const PLAN_DATA = {
  title: 'e2e sync plan',
  imageUrl: 'e2e/none.png',
  width: 1000,
  height: 800,
};
const CORE_LINK = linkId(end(S(1), '1'), end(S(2), '3'));
const H1_LINK = linkId(end(S(2), '1'), end(H(1), HOST_PORT_NUMBER));

describe('ONOS synchronisation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let onos: Server;
  let snapshot: OnosSnapshot;
  let token: string;
  let planId: string;
  let adminId: string;

  const http = () => request(app.getHttpServer());
  const auth = { Authorization: '' };
  const sync = async () =>
    (await http().post('/api/sync').set(auth).expect(200)).body as SyncSummary;
  const device = (onosDeviceId: string) =>
    prisma.networkDevice.findUniqueOrThrow({
      where: { onosDeviceId },
      include: { ports: true },
    });

  beforeAll(async () => {
    // Fake ONOS: serves whatever `snapshot` currently holds.
    onos = createServer((req, res) => {
      const url = decodeURIComponent(req.url ?? '');
      const send = (body: unknown) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (
        req.headers.authorization !==
        `Basic ${Buffer.from('onos:rocks').toString('base64')}`
      ) {
        res.writeHead(401).end();
      } else if (url === '/onos/v1/devices') {
        send({ devices: snapshot.devices.map(({ ports: _p, ...d }) => d) });
      } else if (
        url.startsWith('/onos/v1/devices/') &&
        url.endsWith('/ports')
      ) {
        const id = url.slice('/onos/v1/devices/'.length, -'/ports'.length);
        send({
          id,
          ports: snapshot.devices.find((d) => d.id === id)?.ports ?? [],
        });
      } else if (url === '/onos/v1/links') send({ links: snapshot.links });
      else if (url === '/onos/v1/hosts') send({ hosts: snapshot.hosts });
      else res.writeHead(404).end();
    });
    await new Promise<void>((r) => onos.listen(0, '127.0.0.1', r));
    const { port } = onos.address() as AddressInfo;

    // Must be set before AppModule (and its ConfigModule) is imported.
    Object.assign(process.env, {
      ONOS_URL: `http://127.0.0.1:${port}/onos/v1`,
      ONOS_USER: 'onos',
      ONOS_PASSWORD: 'rocks',
      ONOS_SYNC_ENABLED: 'false',
      ONOS_TIMEOUT_MS: '2000',
    });
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
    await app.init();
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
    adminId = body.user.id;
    auth.Authorization = `Bearer ${token}`;

    await cleanup();
    planId = (
      await prisma.floorPlan.create({
        data: { ...PLAN_DATA, createdBy: body.user.id },
      })
    ).id;
    snapshot = tree2Snapshot(IDS);
  });

  async function cleanup() {
    await prisma.networkDevice.deleteMany({
      where: {
        OR: [
          { onosDeviceId: { startsWith: IDS.dpidPrefix } },
          { onosDeviceId: { startsWith: IDS.macPrefix.toUpperCase() } },
        ],
      },
    });
    await prisma.floorPlan.deleteMany({ where: { title: 'e2e sync plan' } });
  }

  afterAll(async () => {
    if (prisma) await cleanup();
    await app?.close();
    await new Promise((r) => onos?.close(r));
  });

  it('discovers switches, hosts and ports', async () => {
    const summary = await sync();
    expect(summary.devicesCreated).toBe(7);
    expect(summary.portsUpserted).toBe(2 + 3 + 3 + 4);
    expect(summary.linksCreated).toBe(0); // nothing is placed yet

    const s1 = await device(dpid(1, IDS.dpidPrefix));
    expect(s1).toMatchObject({
      deviceType: 'SWITCH',
      status: 'ACTIVE',
      ipAddress: '172.17.0.1',
    });
    expect(s1.ports.map((p) => p.portNumber).sort()).toEqual(['1', '2']);

    const h1 = await device(hostId(1, IDS.macPrefix));
    expect(h1).toMatchObject({
      deviceType: 'HOST',
      ipAddress: '10.0.0.1',
      name: '10.0.0.1',
    });

    const list = (
      await http().get('/api/devices?type=HOST').set(auth).expect(200)
    ).body as NetworkDeviceWithPorts[];
    expect(list.filter((d) => d.onosDeviceId.startsWith('EE:')).length).toBe(4);
  });

  it('keeps a renamed device name on the next sync', async () => {
    const s1 = await device(dpid(1, IDS.dpidPrefix));
    await http()
      .patch(`/api/devices/${s1.id}`)
      .set(auth)
      .send({ name: 'Core switch' })
      .expect(200);
    const summary = await sync();
    expect(summary).toMatchObject({ devicesCreated: 0, devicesUpdated: 7 });
    expect((await device(s1.onosDeviceId)).name).toBe('Core switch');
  });

  it('creates links on a plan where both endpoints are placed', async () => {
    const [s1, s2, h1] = await Promise.all([
      device(dpid(1, IDS.dpidPrefix)),
      device(dpid(2, IDS.dpidPrefix)),
      device(hostId(1, IDS.macPrefix)),
    ]);
    await prisma.spatialCoordinate.createMany({
      data: [s1, s2, h1].map((d, i) => ({
        deviceId: d.id,
        floorPlanId: planId,
        x: 100 * i,
        y: 100,
      })),
    });

    const summary = await sync();
    // s1–s2 and h1–s2; s1–s3 stays off the plan because s3 is not placed.
    expect(summary.linksCreated).toBe(2);
    const links = await prisma.networkLink.findMany({
      where: { floorPlanId: planId },
    });
    expect(links.map((l) => l.onosLinkId)).toHaveLength(2);
    expect(links.map((l) => l.onosLinkId)).toEqual(
      expect.arrayContaining([CORE_LINK, H1_LINK]),
    );
    expect(links.every((l) => l.status === 'ACTIVE')).toBe(true);

    // Idempotent: the next run creates nothing new.
    expect((await sync()).linksCreated).toBe(0);

    // The same cable is drawn on a second plan holding both ends.
    const other = await prisma.floorPlan.create({
      data: { ...PLAN_DATA, createdBy: adminId },
    });
    await prisma.spatialCoordinate.createMany({
      data: [s1, s2].map((d) => ({
        deviceId: d.id,
        floorPlanId: other.id,
        x: 10,
        y: 10,
      })),
    });
    expect((await sync()).linksCreated).toBe(1);
    expect(
      await prisma.networkLink.count({
        where: { floorPlanId: other.id, onosLinkId: CORE_LINK },
      }),
    ).toBe(1);
    await prisma.floorPlan.delete({ where: { id: other.id } });
  });

  it('reflects failures and publishes events', async () => {
    // s1–s2 goes down, s3 disappears, s2 port 2 is disabled.
    snapshot.links = snapshot.links.filter(
      (l) =>
        l.src.device !== dpid(2, IDS.dpidPrefix) &&
        l.dst.device !== dpid(2, IDS.dpidPrefix),
    );
    snapshot.devices = snapshot.devices.filter(
      (d) => d.id !== dpid(3, IDS.dpidPrefix),
    );
    const s2ports = snapshot.devices.find(
      (d) => d.id === dpid(2, IDS.dpidPrefix),
    )!.ports;
    s2ports.find((p) => p.port === '2')!.isEnabled = false;

    const summary = await sync();
    expect(summary.linksWentDown).toBe(1);
    expect(summary.devicesWentOffline).toBe(1);

    expect((await device(dpid(3, IDS.dpidPrefix))).status).toBe('OFFLINE');
    const s2 = await device(dpid(2, IDS.dpidPrefix));
    expect(s2.ports.find((p) => p.portNumber === '2')?.isEnabled).toBe(false);
    const coreLink = await prisma.networkLink.findFirstOrThrow({
      where: { onosLinkId: CORE_LINK },
    });
    expect(coreLink.status).toBe('DOWN');

    const events = (
      await http().get('/api/events?limit=20').set(auth).expect(200)
    ).body as SystemEvent[];
    const types = events.slice(0, 5).map((e) => e.type);
    expect(types).toEqual(
      expect.arrayContaining(['link.status', 'device.status', 'port.status']),
    );
    const linkEvent = events.find((e) => e.type === 'link.status')!;
    expect(linkEvent.floorPlanIds).toEqual([planId]);

    // Recovery brings the link back up.
    snapshot = tree2Snapshot(IDS);
    expect((await sync()).linksUpdated).toBeGreaterThanOrEqual(1);
    expect(
      (
        await prisma.networkLink.findUniqueOrThrow({
          where: { id: coreLink.id },
        })
      ).status,
    ).toBe('ACTIVE');
  });

  it('deletes only devices ONOS no longer reports', async () => {
    const h1 = await device(H(1)); // placed on the plan, linked to s2
    await http().delete(`/api/devices/${h1.id}`).set(auth).expect(409);

    snapshot.hosts = snapshot.hosts.filter((h) => h.id !== H(1));
    expect((await sync()).devicesWentOffline).toBe(1);

    const summary = (
      await http().get('/api/devices/offline/summary').set(auth).expect(200)
    ).body as OfflineDevicesSummary;
    expect(summary.placed).toBeGreaterThanOrEqual(1);

    await http().delete(`/api/devices/${h1.id}`).set(auth).expect(204);
    expect(
      await prisma.networkDevice.findUnique({ where: { id: h1.id } }),
    ).toBeNull();
    // Position and the attached link go with the device.
    expect(
      await prisma.networkLink.count({ where: { onosLinkId: H1_LINK } }),
    ).toBe(0);
    expect(
      await prisma.spatialCoordinate.count({ where: { deviceId: h1.id } }),
    ).toBe(0);

    const events = (
      await http().get('/api/events?limit=1').set(auth).expect(200)
    ).body as SystemEvent[];
    expect(events[0]).toMatchObject({
      type: 'device.removed',
      floorPlanIds: [planId],
    });
  });

  it('reports an unreachable controller', async () => {
    await new Promise((r) => onos.close(r));
    onos.closeAllConnections();
    await http().post('/api/sync').set(auth).expect(503);

    const status = (await http().get('/api/sync/status').set(auth).expect(200))
      .body as SyncStatus;
    expect(status.controllerReachable).toBe(false);
    expect(status.lastError).toMatch(/unreachable/);
    const events = (
      await http().get('/api/events?limit=1').set(auth).expect(200)
    ).body as SystemEvent[];
    expect(events[0]).toMatchObject({
      type: 'controller.status',
      severity: 'critical',
    });
  });
});
