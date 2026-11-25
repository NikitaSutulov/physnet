import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';
import { ApiErrorDto } from '../swagger/api-error.dto.js';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    ApiForbiddenResponse({
      type: ApiErrorDto,
      description: `Allowed only for roles: ${roles.join(', ')}`,
    }),
  );
