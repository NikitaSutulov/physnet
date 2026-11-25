import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { DevicePort, RoutingPolicyResponse } from '@physnet/shared';
import type { PrismaService } from '../src/prisma/prisma.service.js';

/**
 * Routing policies and port state against a fake ONOS that behaves like the
 * real one where it matters: it rejects intents of an unregistered
 * application, takes the intent key from the body, and keeps intents
 * until they are withdrawn. Uses the development database; test data is
 * removed afterwards.
 */
const PREFIX = 'e2e-pol:';
const HOST_A = 'E2:E2:E2:E2:E2:01/None';
const HOST_B = 'E2:E2:E2:E2:E2:02/None';
const APP_ID = 'org.onosproject.physnet';

interface FakeIntent {
  key: string;
  appId: string;
  state: string;
  body: Record<string, unknown>;
}

describe('Policies (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let onos: Server;
  let onosUp = true;
  const registered = new Set<string>();
  const intents = new Map<string, FakeIntent>();
  const portStates: Array<{ device: string; port: string; enabled: boolean }> =
    [];
  let nextKey = 1;
  const auth = { Authorization: '' };
  const http = () => request(app.getHttpServer());
  let switchPorts: DevicePort[];
  let hostPort: DevicePort;

  const createPolicy = (name: string, payload: object) =>
    http()
      .post('/api/policies')
      .set(auth)
      .send({ name: `${PREFIX}${name}`, payload });
  const h2h = { type: 'HostToHostIntent', one: HOST_A, two: HOST_B };
  const p2p = {
    type: 'PointToPointIntent',
    ingressPoint: { device: `${PREFIX}sw`, port: '1' },
    egressPoint: { device: `${PREFIX}sw`, port: '2' },
  };

  beforeAll(async () => {
    onos = createServer((req, res) => {
      const url = decodeURIComponent(req.url ?? '').replace(/^\/onos\/v1/, '');
      let raw = '';
      req.on('data', (c: Buffer) => (raw += c.toString()));
      req.on('end', () => {
        const json = (status: number, body?: unknown) => {
          res.writeHead(status, { 'content-type': 'application/json' });
          res.end(body === undefined ? '' : JSON.stringify(body));
        };
        const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        let m: RegExpMatchArray | null;
        if (
          req.method === 'POST' &&
          (m = url.match(/^\/applications\/([^/]+)\/register$/))
        ) {
          // Like the real ONOS: this endpoint rejects any content type.
          if (req.headers['content-type']) {
            return json(415, { code: 415, message: 'Unsupported Media Type' });
          }
          registered.add(m[1]);
          return json(200, { id: 42, name: m[1] });
        }
        if (req.method === 'POST' && url === '/intents') {
          const appId = String(body['appId']);
          if (!registered.has(appId)) {
            return json(400, {
              code: 400,
              message: 'Application ID is not found',
            });
          }
          // Like ONOS: the given key, else one derived from the id.
          const id = nextKey++;
          const key =
            typeof body['key'] === 'string'
              ? body['key']
              : `0x${id.toString(16)}`;
          intents.set(key, { key, appId, state: 'INSTALLED', body });
          res.writeHead(201, {
            location: `http://127.0.0.1/onos/v1/intents/${appId}/${id}`,
          });
          return res.end();
        }
        if (
          req.method === 'GET' &&
          (m = url.match(/^\/intents\/application\/([^/]+)$/))
        ) {
          const appId = m[1];
          return json(200, {
            intents: [...intents.values()]
              .filter((i) => i.appId === appId)
              .map(({ key, state, appId: a }) => ({ key, state, appId: a })),
          });
        }
        if ((m = url.match(/^\/intents\/([^/]+)\/([^/]+)$/))) {
          // Like ONOS: found by key ("0x8") or by decimal id ("8").
          const intent =
            intents.get(m[2]) ?? intents.get(`0x${Number(m[2]).toString(16)}`);
          if (!intent)
            return json(404, { code: 404, message: 'Intent not found' });
          if (req.method === 'GET')
            return json(200, {
              ...intent.body,
              key: intent.key,
              state: intent.state,
            });
          if (req.method === 'DELETE') {
            intents.delete(intent.key);
            res.writeHead(204);
            return res.end();
          }
        }
        if (
          req.method === 'POST' &&
          (m = url.match(/^\/devices\/([^/]+)\/portstate\/([^/]+)$/))
        ) {
          portStates.push({
            device: m[1],
            port: m[2],
            enabled: body['enabled'] === true,
          });
          return json(200, {});
        }
        json(404, { code: 404, message: `fake ONOS: ${req.method} ${url}` });
      });
    });
    // While "down", connections are refused by closing them straight away.
    onos.on('connection', (socket) => {
      if (!onosUp) socket.destroy();
    });
    await new Promise<void>((r) => onos.listen(0, '127.0.0.1', r));
    const { port } = onos.address() as AddressInfo;

    Object.assign(process.env, {
      ONOS_URL: `http://127.0.0.1:${port}/onos/v1`,
      ONOS_USER: 'onos',
      ONOS_PASSWORD: 'rocks',
      ONOS_SYNC_ENABLED: 'false',
      ONOS_TIMEOUT_MS: '2000',
      ONOS_APP_ID: APP_ID,
    });
    const { AppModule } = await import('../src/app.module.js');
    const { PrismaService } = await import('../src/prisma/prisma.service.js');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
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
    auth.Authorization = `Bearer ${(login.body as { accessToken: string }).accessToken}`;

    await cleanup();
    const sw = await prisma.networkDevice.create({
      data: {
        onosDeviceId: `${PREFIX}sw`,
        name: 'pol-sw',
        deviceType: 'SWITCH',
        ports: { create: [{ portNumber: '1' }, { portNumber: '2' }] },
      },
      include: { ports: { orderBy: { portNumber: 'asc' } } },
    });
    switchPorts = sw.ports;
    for (const id of [HOST_A, HOST_B]) {
      const host = await prisma.networkDevice.create({
        data: {
          onosDeviceId: id,
          name: id,
          deviceType: 'HOST',
          ports: { create: [{ portNumber: '0' }] },
        },
        include: { ports: true },
      });
      hostPort = host.ports[0];
    }
  });

  async function cleanup() {
    await prisma.routingPolicy.deleteMany({
      where: { name: { startsWith: PREFIX } },
    });
    await prisma.networkDevice.deleteMany({
      where: { onosDeviceId: { in: [`${PREFIX}sw`, HOST_A, HOST_B] } },
    });
  }

  afterAll(async () => {
    if (prisma) await cleanup();
    await app?.close();
    onos?.closeAllConnections();
    await new Promise((r) => onos?.close(r));
  });

  it('validates policies against the inventory', async () => {
    await createPolicy('same', { ...h2h, two: HOST_A }).expect(400);
    await createPolicy('ghost', {
      ...h2h,
      two: 'E2:E2:E2:E2:E2:FF/None',
    }).expect(400);
    await createPolicy('type', {
      ...h2h,
      type: 'MultiPointToSinglePointIntent',
    }).expect(400);
    await createPolicy('port', {
      ...p2p,
      egressPoint: { device: `${PREFIX}sw`, port: '9' },
    }).expect(400);
    await createPolicy('loop', {
      ...p2p,
      egressPoint: p2p.ingressPoint,
    }).expect(400);
    await createPolicy('cidr', {
      ...p2p,
      selector: { ipSrc: '10.0.0.300' },
    }).expect(400);
    await createPolicy('l4', {
      ...p2p,
      selector: { protocol: 'ICMP', dstPort: 80 },
    }).expect(400);
    await createPolicy('prio', { ...h2h, priority: 0 }).expect(400);
  });

  it('applies a host-to-host policy and reports its state', async () => {
    const created = (await createPolicy('h2h', h2h).expect(201))
      .body as RoutingPolicyResponse;
    expect(created).toMatchObject({
      intentType: 'HostToHostIntent',
      isApplied: false,
      intentKey: null,
      state: 'NOT_APPLIED',
      payload: { ...h2h, priority: 100 },
      creator: { firstName: expect.any(String) as string },
    });

    const applied = (
      await http()
        .post(`/api/policies/${created.id}/apply`)
        .set(auth)
        .expect(200)
    ).body as RoutingPolicyResponse;
    const key = `physnet-${created.id}`;
    expect(applied).toMatchObject({
      isApplied: true,
      intentKey: key,
      state: 'INSTALLED',
    });
    // The application was registered first, and ONOS got the intent body.
    expect(registered.has(APP_ID)).toBe(true);
    expect(intents.get(key)?.body).toEqual({
      type: 'HostToHostIntent',
      appId: APP_ID,
      key,
      priority: 100,
      one: HOST_A,
      two: HOST_B,
    });

    await http()
      .post(`/api/policies/${created.id}/apply`)
      .set(auth)
      .expect(409);
    await http()
      .patch(`/api/policies/${created.id}`)
      .set(auth)
      .send({ name: 'x' })
      .expect(409);

    const list = (await http().get('/api/policies').set(auth).expect(200))
      .body as RoutingPolicyResponse[];
    expect(list.find((p) => p.id === created.id)?.state).toBe('INSTALLED');

    // An intent removed behind our back shows up as missing.
    intents.get(key)!.state = 'FAILED';
    expect(
      (
        (await http().get(`/api/policies/${created.id}`).set(auth).expect(200))
          .body as RoutingPolicyResponse
      ).state,
    ).toBe('FAILED');
    intents.delete(key);
    expect(
      (
        (await http().get(`/api/policies/${created.id}`).set(auth).expect(200))
          .body as RoutingPolicyResponse
      ).state,
    ).toBe('MISSING');

    const withdrawn = (
      await http()
        .post(`/api/policies/${created.id}/withdraw`)
        .set(auth)
        .expect(200)
    ).body as RoutingPolicyResponse;
    expect(withdrawn).toMatchObject({
      isApplied: false,
      intentKey: null,
      state: 'NOT_APPLIED',
    });
    await http()
      .post(`/api/policies/${created.id}/withdraw`)
      .set(auth)
      .expect(409);
  });

  it('sends point-to-point selectors as ONOS criteria', async () => {
    const created = (
      await createPolicy('p2p', {
        ...p2p,
        priority: 300,
        selector: {
          ipSrc: '10.0.0.1',
          ipDst: '10.0.0.0/24',
          protocol: 'TCP',
          dstPort: 80,
        },
      }).expect(201)
    ).body as RoutingPolicyResponse;
    const applied = (
      await http()
        .post(`/api/policies/${created.id}/apply`)
        .set(auth)
        .expect(200)
    ).body as RoutingPolicyResponse;
    expect(intents.get(applied.intentKey!)?.body).toMatchObject({
      type: 'PointToPointIntent',
      priority: 300,
      ingressPoint: { device: `${PREFIX}sw`, port: '1' },
      selector: {
        criteria: [
          { type: 'ETH_TYPE', ethType: '0x0800' },
          { type: 'IPV4_SRC', ip: '10.0.0.1/32' },
          { type: 'IPV4_DST', ip: '10.0.0.0/24' },
          { type: 'IP_PROTO', protocol: 6 },
          { type: 'TCP_DST', tcpPort: 80 },
        ],
      },
    });

    // Deleting an applied policy withdraws its intent too.
    await http().delete(`/api/policies/${created.id}`).set(auth).expect(204);
    expect(intents.has(applied.intentKey!)).toBe(false);
  });

  it('copes with an unreachable controller', async () => {
    const created = (await createPolicy('down', h2h).expect(201))
      .body as RoutingPolicyResponse;
    await http()
      .post(`/api/policies/${created.id}/apply`)
      .set(auth)
      .expect(200);

    onosUp = false;
    onos.closeAllConnections();
    const list = (await http().get('/api/policies').set(auth).expect(200))
      .body as RoutingPolicyResponse[];
    expect(list.find((p) => p.id === created.id)?.state).toBe('UNKNOWN');
    await http()
      .post(`/api/policies/${created.id}/withdraw`)
      .set(auth)
      .expect(503);
    onosUp = true;

    await http()
      .post(`/api/policies/${created.id}/withdraw`)
      .set(auth)
      .expect(200);
  });

  it('switches a port through ONOS', async () => {
    const [port] = switchPorts;
    const updated = (
      await http()
        .patch(`/api/ports/${port.id}`)
        .set(auth)
        .send({ isEnabled: false })
        .expect(200)
    ).body as DevicePort;
    expect(updated.isEnabled).toBe(false);
    expect(portStates.at(-1)).toEqual({
      device: `${PREFIX}sw`,
      port: '1',
      enabled: false,
    });

    await http()
      .patch(`/api/ports/${port.id}`)
      .set(auth)
      .send({ isEnabled: true })
      .expect(200);
    expect(portStates.at(-1)?.enabled).toBe(true);

    await http()
      .patch(`/api/ports/${hostPort.id}`)
      .set(auth)
      .send({ isEnabled: false })
      .expect(400);
    await http()
      .patch(`/api/ports/${port.id}`)
      .set(auth)
      .send({ isEnabled: 'no' })
      .expect(400);
  });
});
