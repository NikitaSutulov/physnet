import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { SOCKET_ID_HEADER } from '@physnet/shared';

export const SocketId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const value = ctx.switchToHttp().getRequest<Request>().headers[
      SOCKET_ID_HEADER
    ];
    return typeof value === 'string' && value.length <= 64 ? value : undefined;
  },
);
