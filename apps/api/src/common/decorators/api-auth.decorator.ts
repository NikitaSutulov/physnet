import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiErrorDto } from '../swagger/api-error.dto.js';

export const ApiAuth = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      type: ApiErrorDto,
      description: 'Missing, invalid or expired access token',
    }),
  );
