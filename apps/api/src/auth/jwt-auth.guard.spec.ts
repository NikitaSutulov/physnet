import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard, extractBearerToken } from './jwt-auth.guard.js';

const jwt = new JwtService({ secret: 'y'.repeat(32) });

function ctx(headers: Record<string, string>, isPublic = false) {
  const request: Record<string, unknown> = { headers };
  const reflector = {
    getAllAndOverride: () => isPublic,
  } as unknown as Reflector;
  const context = {
    getType: () => 'http',
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { guard: new JwtAuthGuard(jwt, reflector), context, request };
}

describe('JwtAuthGuard', () => {
  it('parses Bearer headers only', () => {
    expect(extractBearerToken('Bearer abc')).toBe('abc');
    expect(extractBearerToken('Basic abc')).toBeUndefined();
    expect(extractBearerToken(undefined)).toBeUndefined();
  });

  it('allows public routes without a token', async () => {
    const { guard, context } = ctx({}, true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects missing and forged tokens', async () => {
    await expect(ctx({}).guard.canActivate(ctx({}).context)).rejects.toThrow(
      UnauthorizedException,
    );
    const forged = new JwtService({ secret: 'z'.repeat(32) }).sign({
      sub: '1',
    });
    const c = ctx({ authorization: `Bearer ${forged}` });
    await expect(c.guard.canActivate(c.context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the payload for a valid token', async () => {
    const token = jwt.sign({ sub: 'u1', email: 'a@b.c', role: 'ADMIN' });
    const c = ctx({ authorization: `Bearer ${token}` });
    await expect(c.guard.canActivate(c.context)).resolves.toBe(true);
    expect(c.request['user']).toMatchObject({ sub: 'u1', role: 'ADMIN' });
  });
});
