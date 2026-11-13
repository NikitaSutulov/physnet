import type { AuthUser } from '@physnet/shared';
import type { Administrator } from '../generated/prisma/client.js';

export function toAuthUser(admin: Administrator): AuthUser {
  const { passwordHash: _omit, ...rest } = admin;
  return rest;
}
