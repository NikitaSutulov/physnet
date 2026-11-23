import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type {
  NetworkDeviceWithPorts,
  PlacedDevice,
  TopologyLink,
  TopologyResponse,
} from '@physnet/shared';
import type { PrismaService } from '../src/prisma/prisma.service.js';

/**
 * Placing devices on a floor plan, against the development database.
 * Test data uses the `e2e-topo:` id namespace and is removed afterwards.
 * Requires `pnpm infra:up` and `pnpm db:seed`.
 */
const PREFIX = 'e2e-topo:';
const PLAN_TITLE = 'e2e topology plan';

describe('Topology (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let planId: string;
  let a: NetworkDeviceWithPorts;
  let b: NetworkDeviceWithPorts;
  const auth = { Authorization: '' };
  const http = () => request(app.getHttpServer());
  const positionUrl = (deviceId: string, plan = planId) =>
    `/api/floor-plans/${plan}/devices/${deviceId}/position`;
  const topology = async () =>
    (
      await http()
        .get(`/api/floor-plans/${planId}/topology`)
        .set(auth)
        .expect(200)
    ).body as TopologyResponse;
  const unplaced = async () =>
    (
      await http()
        .get(`/api/devices/unplaced?floorPlanId=${planId}`)
        .set(auth)
        .expect(200)
    ).body as NetworkDeviceWithPorts[];

  async function cleanup() {
    await prisma.networkDevice.deleteMany({
      where: { onosDeviceId: { startsWith: PREFIX } },
    });
    await prisma.floorPlan.deleteMany({ where: { title: PLAN_TITLE } });
  }

  beforeAll(async () => {
    // No polling: the test must not depend on a live controller.
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
    auth.Authorization = `Bearer ${body.accessToken}`;

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
    const device = (n: number, type: string) =>
      prisma.networkDevice.create({
        data: {
          onosDeviceId: `${PREFIX}${n}`,
          name: `topo-${n}`,
          deviceType: type,
          ports: { create: [{ portNumber: '1' }, { portNumber: '2' }] },
        },
        include: { ports: { orderBy: { portNumber: 'asc' } } },
      });
    [a, b] = await Promise.all([device(1, 'SWITCH'), device(2, 'HOST')]);
  });

  afterAll(async () => {
    if (prisma) await cleanup();
    await app?.close();
  });

  it('places a device and moves it', async () => {
    expect((await unplaced()).map((d) => d.id)).toEqual(
      expect.arrayContaining([a.id, b.id]),
    );

    const placed = (
      await http()
        .put(positionUrl(a.id))
        .set(auth)
        .send({ x: 100, y: 200, rotation: -90 })
        .expect(200)
    ).body as PlacedDevice;
    expect(placed.position).toMatchObject({ x: 100, y: 200, rotation: 270 });
    expect(placed.ports).toHaveLength(2);

    // Moving keeps the rotation when it is not sent.
    const moved = (
      await http()
        .put(positionUrl(a.id))
        .set(auth)
        .send({ x: 1000, y: 0 })
        .expect(200)
    ).body as PlacedDevice;
    expect(moved.position).toMatchObject({ x: 1000, y: 0, rotation: 270 });

    expect((await unplaced()).map((d) => d.id)).not.toContain(a.id);
    const topo = await topology();
    expect(topo.devices.map((d) => d.id)).toEqual([a.id]);
  });

  it('rejects positions outside the plan and unknown ids', async () => {
    await http()
      .put(positionUrl(b.id))
      .set(auth)
      .send({ x: 1001, y: 0 })
      .expect(400);
    await http()
      .put(positionUrl(b.id))
      .set(auth)
      .send({ x: -1, y: 0 })
      .expect(400);
    await http()
      .put(positionUrl('00000000-0000-4000-8000-000000000000'))
      .set(auth)
      .send({ x: 1, y: 1 })
      .expect(404);
    await http()
      .put(positionUrl(b.id, '00000000-0000-4000-8000-000000000000'))
      .set(auth)
      .send({ x: 1, y: 1 })
      .expect(404);
    await http()
      .put(positionUrl('nope'))
      .set(auth)
      .send({ x: 1, y: 1 })
      .expect(400);
    await http().get('/api/devices/unplaced').set(auth).expect(400);
  });

  it('returns cables with endpoints and removes them with a device', async () => {
    await http()
      .put(positionUrl(b.id))
      .set(auth)
      .send({ x: 500, y: 400 })
      .expect(200);
    await prisma.networkLink.create({
      data: {
        floorPlanId: planId,
        sourcePortId: a.ports[0].id,
        destinationPortId: b.ports[1].id,
        waypoints: [{ x: 700, y: 50 }, { bogus: true }],
      },
    });

    const [link] = (await topology()).links;
    expect(link).toMatchObject({
      source: { deviceId: a.id, portNumber: '1' },
      destination: { deviceId: b.id, portNumber: '2' },
      waypoints: [{ x: 700, y: 50 }],
      status: 'ACTIVE',
    });

    await http().delete(positionUrl(b.id)).set(auth).expect(204);
    const after = await topology();
    expect(after.devices.map((d) => d.id)).toEqual([a.id]);
    expect(after.links).toHaveLength(0);
    await http().delete(positionUrl(b.id)).set(auth).expect(404);
  });

  it('draws, edits and deletes a cable by hand', async () => {
    // b was taken off the plan by the previous test.
    const linksUrl = `/api/floor-plans/${planId}/links`;
    const cable = (src: string, dst: string, extra = {}) =>
      http()
        .post(linksUrl)
        .set(auth)
        .send({ sourcePortId: src, destinationPortId: dst, ...extra });

    await cable(a.ports[0].id, b.ports[0].id).expect(400); // b not placed
    await http()
      .put(positionUrl(b.id))
      .set(auth)
      .send({ x: 1, y: 1 })
      .expect(200);
    await cable(a.ports[0].id, a.ports[1].id).expect(400); // same device
    await cable(a.ports[0].id, '00000000-0000-4000-8000-000000000000').expect(
      404,
    );
    await cable(a.ports[0].id, b.ports[0].id, {
      waypoints: [{ x: 1001, y: 0 }],
    }).expect(400);

    const created = (
      await cable(a.ports[0].id, b.ports[0].id, {
        cableType: 'OPTICAL',
        waypoints: [{ x: 10, y: 20 }],
      }).expect(201)
    ).body as TopologyLink;
    expect(created).toMatchObject({
      onosLinkId: null,
      cableType: 'OPTICAL',
      waypoints: [{ x: 10, y: 20 }],
      source: { deviceId: a.id, portNumber: '1' },
      destination: { deviceId: b.id, portNumber: '1' },
    });
    // Port a/1 is taken now.
    await cable(b.ports[1].id, a.ports[0].id).expect(409);

    const linkUrl = `/api/links/${created.id}`;
    const updated = (
      await http()
        .patch(linkUrl)
        .set(auth)
        .send({
          cableType: 'COPPER',
          waypoints: [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
          ],
        })
        .expect(200)
    ).body as TopologyLink;
    expect(updated).toMatchObject({
      cableType: 'COPPER',
      waypoints: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    });
    await http()
      .patch(linkUrl)
      .set(auth)
      .send({ cableType: 'WIFI' })
      .expect(400);
    await http()
      .patch(linkUrl)
      .set(auth)
      .send({ waypoints: [{ x: 0, y: 801 }] })
      .expect(400);
    await http()
      .patch(linkUrl)
      .set(auth)
      .send({ waypoints: Array.from({ length: 51 }, () => ({ x: 1, y: 1 })) })
      .expect(400);
    expect((await topology()).links[0].waypoints).toHaveLength(2);

    await http().delete(linkUrl).set(auth).expect(204);
    await http().delete(linkUrl).set(auth).expect(404);
    expect((await topology()).links).toHaveLength(0);
  });

  it('keeps cables mirrored from ONOS', async () => {
    const link = await prisma.networkLink.create({
      data: {
        floorPlanId: planId,
        sourcePortId: a.ports[1].id,
        destinationPortId: b.ports[1].id,
        onosLinkId: `${PREFIX}1/2~${PREFIX}2/2`,
      },
    });
    await http().delete(`/api/links/${link.id}`).set(auth).expect(409);
    // Bends are still editable.
    await http()
      .patch(`/api/links/${link.id}`)
      .set(auth)
      .send({ waypoints: [{ x: 5, y: 5 }] })
      .expect(200);
  });
});
