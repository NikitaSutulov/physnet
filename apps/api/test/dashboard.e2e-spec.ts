import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { DashboardStats } from '@physnet/shared';
import type { PrismaService } from '../src/prisma/prisma.service.js';

/**
 * Dashboard counters, checked as differences so that whatever else is in
 * the e2e database does not matter. Test data uses the `e2e-dash:`
 * namespace and is removed afterwards.
 */
const PREFIX = 'e2e-dash:';
const BUILDING = 'e2e dashboard building';

describe('Dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const auth = { Authorization: '' };
  let adminId: string;

  const stats = async () =>
    (
      await request(app.getHttpServer())
        .get('/api/dashboard/stats')
        .set(auth)
        .expect(200)
    ).body as DashboardStats;

  async function cleanup() {
    await prisma.networkDevice.deleteMany({
      where: { onosDeviceId: { startsWith: PREFIX } },
    });
    await prisma.floorPlan.deleteMany({ where: { building: BUILDING } });
  }

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
    await app.init();
    prisma = app.get(PrismaService);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: process.env['SEED_ADMIN_EMAIL'] ?? 'admin@physnet.local',
        password: process.env['SEED_ADMIN_PASSWORD'] ?? 'changeme123',
      })
      .expect(200);
    const body = login.body as { accessToken: string; user: { id: string } };
    auth.Authorization = `Bearer ${body.accessToken}`;
    adminId = body.user.id;
    await cleanup();
  });

  afterAll(async () => {
    if (prisma) await cleanup();
    await app?.close();
  });

  it('requires authentication', () =>
    request(app.getHttpServer()).get('/api/dashboard/stats').expect(401));

  it('counts devices, ports, cables and plans', async () => {
    const before = await stats();

    const plan = await prisma.floorPlan.create({
      data: {
        title: 'e2e dashboard plan',
        building: BUILDING,
        floorLevel: 1,
        imageUrl: 'e2e/none.png',
        width: 100,
        height: 100,
        createdBy: adminId,
      },
    });
    // A placed active switch with one port up and one down, an offline host
    // that is not placed, and a DOWN cable between them on the plan.
    const sw = await prisma.networkDevice.create({
      data: {
        onosDeviceId: `${PREFIX}1`,
        name: 'dash-sw',
        deviceType: 'SWITCH',
        ports: {
          create: [
            { portNumber: '1', isEnabled: true },
            { portNumber: '2', isEnabled: false },
          ],
        },
        spatialCoordinates: { create: { floorPlanId: plan.id, x: 1, y: 1 } },
      },
      include: { ports: true },
    });
    const host = await prisma.networkDevice.create({
      data: {
        onosDeviceId: `${PREFIX}2`,
        name: 'dash-host',
        deviceType: 'HOST',
        status: 'OFFLINE',
        ports: { create: [{ portNumber: '0' }] },
      },
      include: { ports: true },
    });
    await prisma.networkLink.create({
      data: {
        floorPlanId: plan.id,
        sourcePortId: sw.ports[0].id,
        destinationPortId: host.ports[0].id,
        status: 'DOWN',
      },
    });

    const after = await stats();
    expect(after.devices.total - before.devices.total).toBe(2);
    expect(after.devices.byType.SWITCH - before.devices.byType.SWITCH).toBe(1);
    expect(after.devices.byType.HOST - before.devices.byType.HOST).toBe(1);
    expect(after.devices.offline - before.devices.offline).toBe(1);
    expect(after.devices.unplaced - before.devices.unplaced).toBe(1);
    expect(after.ports.total - before.ports.total).toBe(3);
    expect(after.ports.up - before.ports.up).toBe(2);
    expect(after.links.total - before.links.total).toBe(1);
    expect(after.links.down - before.links.down).toBe(1);
    expect(after.floorPlans - before.floorPlans).toBe(1);
    expect(after.buildings - before.buildings).toBe(1);
    expect(after.controller).toMatchObject({ enabled: false });
  });
});
