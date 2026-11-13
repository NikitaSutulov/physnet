import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { AuthUser } from '@physnet/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { toAuthUser } from './administrators.mapper.js';
import type { CreateAdministratorDto } from './dto/create-administrator.dto.js';
import type { UpdateAdministratorDto } from './dto/update-administrator.dto.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdministratorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AuthUser[]> {
    const admins = await this.prisma.administrator.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return admins.map(toAuthUser);
  }

  async findOne(id: string): Promise<AuthUser> {
    const admin = await this.prisma.administrator.findUnique({
      where: { id },
    });
    if (!admin) throw new NotFoundException(`Administrator ${id} not found`);
    return toAuthUser(admin);
  }

  async create(dto: CreateAdministratorDto): Promise<AuthUser> {
    try {
      const admin = await this.prisma.administrator.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role ?? 'ADMIN',
        },
      });
      return toAuthUser(admin);
    } catch (e) {
      throw mapPrismaError(e, dto.email);
    }
  }

  async update(id: string, dto: UpdateAdministratorDto): Promise<AuthUser> {
    await this.findOne(id);
    const { password, email, ...rest } = dto;
    try {
      const admin = await this.prisma.administrator.update({
        where: { id },
        data: {
          ...rest,
          ...(email && { email: email.toLowerCase() }),
          ...(password && {
            passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
          }),
        },
      });
      return toAuthUser(admin);
    } catch (e) {
      throw mapPrismaError(e, email);
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    try {
      await this.prisma.administrator.delete({ where: { id } });
    } catch (e) {
      // ON DELETE RESTRICT: the admin still owns plans or policies.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new ConflictException(
          'Administrator owns floor plans or routing policies and cannot be deleted',
        );
      }
      throw e;
    }
  }
}

function mapPrismaError(e: unknown, email?: string): unknown {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new ConflictException(`Email ${email ?? ''} is already in use`);
  }
  return e;
}
