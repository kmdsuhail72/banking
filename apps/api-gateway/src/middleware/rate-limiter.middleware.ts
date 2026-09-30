import { Injectable, NestMiddleware, HttpStatus } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private ipMap = new Map<string, RateLimitRecord>();
  private readonly limit = 200; // max 200 requests
  private readonly windowMs = 60 * 1000; // 1 minute

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const now = Date.now();

    let record = this.ipMap.get(ip);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      this.ipMap.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, this.limit - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", this.limit);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);

    if (record.count > this.limit) {
      return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: "Too many requests. Please try again later.",
        retryAfter: resetSeconds,
      });
    }

    next();
  }
}
