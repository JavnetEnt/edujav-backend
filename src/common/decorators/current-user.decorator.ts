import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface JwtUserPayload {
  sub: string;
  tenantId: string;
  role: Role;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
