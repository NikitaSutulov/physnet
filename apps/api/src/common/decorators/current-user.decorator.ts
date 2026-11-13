import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '@physnet/shared';

export type RequestWithUser = Request & { user?: JwtPayload };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined =>
    ctx.switchToHttp().getRequest<RequestWithUser>().user,
);
