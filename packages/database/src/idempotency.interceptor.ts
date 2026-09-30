import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import Redis from 'ioredis';
import { createLogger } from '@banking/logger';

const logger = createLogger('IdempotencyInterceptor');

const IDEMPOTENCY_TTL_SECONDS = 86_400; // 24 hours

/**
 * NestJS interceptor for idempotent HTTP endpoints.
 *
 * Usage — decorate a controller or specific route:
 *   @UseInterceptors(IdempotencyInterceptor)
 *
 * The client sends:  Idempotency-Key: <uuid>
 * On first request:  execute handler, cache {status, body} in Redis for 24 h
 * On duplicate:      return cached response immediately (no handler execution)
 *
 * The interceptor is skipped for GET / HEAD / OPTIONS requests.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly redis: Redis) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = ctx.switchToHttp().getRequest<import('express').Request>();
    const res = ctx.switchToHttp().getResponse<import('express').Response>();

    // Only meaningful for mutating methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next.handle();
    }

    const key = req.headers['idempotency-key'] as string | undefined;
    if (!key) return next.handle();

    const cacheKey = `idempotency:${key}`;

    // Return cached response if present
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const { status, body } = JSON.parse(cached);
      logger.debug(`Idempotency hit for key ${key}`);
      res.status(status).json(body);
      // Return empty observable — response already sent
      return of(undefined);
    }

    // Execute handler, then cache the result
    return next.handle().pipe(
      tap({
        next: async (body) => {
          const status = res.statusCode;
          await this.redis.set(
            cacheKey,
            JSON.stringify({ status, body }),
            'EX',
            IDEMPOTENCY_TTL_SECONDS,
          );
        },
        error: async (err: HttpException) => {
          // Also cache error responses to prevent duplicate side-effects
          if (err instanceof HttpException) {
            const status = err.getStatus();
            const body = err.getResponse();
            await this.redis.set(
              cacheKey,
              JSON.stringify({ status, body }),
              'EX',
              300, // short TTL for errors
            );
          }
        },
      }),
    );
  }
}
