import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@banking/shared-types';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

export const IdempotencyKeyParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return (
      (request.headers['idempotency-key'] as string) ||
      (request.headers['x-idempotency-key'] as string) ||
      request.body?.idempotencyKey
    );
  },
);
