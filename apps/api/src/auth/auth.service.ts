import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { JwtPayload, LoginResponse, AuthUser } from '@physnet/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { toAuthUser } from '../administrators/administrators.mapper.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const admin = await this.prisma.administrator.findUnique({
      where: { email: email.toLowerCase() },
    });
    // Compare even when the user is missing to keep timing uniform.
    const hash = admin?.passwordHash ?? DUMMY_HASH;
    const valid = await bcrypt.compare(password, hash);
    if (!admin || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    };
    const accessToken = await this.jwt.signAsync(payload);
    const { exp } = this.jwt.decode<JwtPayload>(accessToken);

    return {
      accessToken,
      expiresAt: new Date((exp ?? 0) * 1000).toISOString(),
      user: toAuthUser(admin),
    };
  }

  async me(userId: string): Promise<AuthUser> {
    const admin = await this.prisma.administrator.findUnique({
      where: { id: userId },
    });
    if (!admin) throw new UnauthorizedException('Account no longer exists');
    return toAuthUser(admin);
  }
}

// Hash of a throwaway string; compared against when the email is unknown so
// both code paths cost the same bcrypt work.
const DUMMY_HASH = bcrypt.hashSync('physnet-timing-dummy', 10);
