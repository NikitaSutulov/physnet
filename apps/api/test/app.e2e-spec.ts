import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

/** Requires `pnpm infra:up` and a seeded administrator (`pnpm db:seed`). */
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health is public', () =>
    request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' }));

  it('rejects protected routes without a token', () =>
    request(app.getHttpServer()).get('/api/auth/me').expect(401));

  it('logs in and reads the profile', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: process.env['SEED_ADMIN_EMAIL'] ?? 'admin@physnet.local',
        password: process.env['SEED_ADMIN_PASSWORD'] ?? 'changeme123',
      })
      .expect(200);

    const token = (login.body as { accessToken: string }).accessToken;
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.body).not.toHaveProperty('passwordHash');
  });
});
