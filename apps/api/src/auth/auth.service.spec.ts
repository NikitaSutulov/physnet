import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const SECRET = 'x'.repeat(32);

function makeService(admin: Record<string, unknown> | null) {
  const findUnique = vi.fn().mockResolvedValue(admin);
  const prisma = {
    administrator: { findUnique },
  } as unknown as PrismaService;
  const jwt = new JwtService({
    secret: SECRET,
    signOptions: { expiresIn: '15m' },
  });
  return { service: new AuthService(prisma, jwt), jwt, findUnique };
}

describe('AuthService', () => {
  const admin = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@physnet.local',
    passwordHash: bcrypt.hashSync('changeme123', 4),
    firstName: 'A',
    lastName: 'B',
    role: 'ADMIN',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('issues a verifiable token without leaking the hash', async () => {
    const { service, jwt } = makeService(admin);
    const res = await service.login('ADMIN@physnet.local', 'changeme123');

    const payload = await jwt.verifyAsync(res.accessToken);
    expect(payload).toMatchObject({ sub: admin.id, role: 'ADMIN' });
    expect(res.user).not.toHaveProperty('passwordHash');
    expect(new Date(res.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('normalises the email before lookup', async () => {
    const { service, findUnique } = makeService(admin);
    await service.login('ADMIN@PhysNet.Local', 'changeme123');
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@physnet.local' },
    });
  });

  it('rejects a wrong password', async () => {
    const { service } = makeService(admin);
    await expect(service.login(admin.email, 'nope-nope')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an unknown email', async () => {
    const { service } = makeService(null);
    await expect(service.login('ghost@x.io', 'changeme123')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
