import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";
import { appConfig } from "@banking/config";
import { createLogger } from "@banking/logger";
import { RedisSessionData } from "@banking/shared-types";

@Injectable()
export class RedisSessionService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis | null = null;
  private logger = createLogger("RedisSessionService");
  private isConnected = false;
  // In-memory fallback map for offline local testing
  private inMemoryStore = new Map<
    string,
    { data: RedisSessionData; expiresAt: number }
  >();

  async onModuleInit() {
    try {
      this.redis = new Redis(appConfig.redis.url, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 2) return null;
          return 500;
        },
        lazyConnect: true,
      });

      this.redis.on("connect", () => {
        this.isConnected = true;
        this.logger.info("Connected to Redis for session management");
      });

      this.redis.on("error", (err) => {
        this.isConnected = false;
        this.logger.warn(
          `Redis connection warning (${err.message}). In-memory session store active.`,
        );
      });

      await this.redis.connect();
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(
        `Could not connect to Redis at ${appConfig.redis.url} (${err?.message}). Using memory session fallback.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch (err) {
        // ignore
      }
    }
  }

  private getKey(userId: string, sessionId: string): string {
    return `session:${userId}:${sessionId}`;
  }

  async createSession(
    userId: string,
    sessionId: string,
    sessionData: RedisSessionData,
    ttlSeconds: number = 7 * 24 * 60 * 60, // 7 days default
  ): Promise<void> {
    const key = this.getKey(userId, sessionId);
    const serialized = JSON.stringify(sessionData);

    if (this.isConnected && this.redis) {
      try {
        await this.redis.set(key, serialized, "EX", ttlSeconds);
        return;
      } catch (err: any) {
        this.logger.warn(
          `Redis set failed (${err.message}), falling back to memory store`,
        );
      }
    }

    // Fallback store
    this.inMemoryStore.set(key, {
      data: sessionData,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async getSession(
    userId: string,
    sessionId: string,
  ): Promise<RedisSessionData | null> {
    const key = this.getKey(userId, sessionId);

    if (this.isConnected && this.redis) {
      try {
        const raw = await this.redis.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as RedisSessionData;
      } catch (err: any) {
        this.logger.warn(
          `Redis get failed (${err.message}), falling back to memory store`,
        );
      }
    }

    // Fallback store
    const item = this.inMemoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.inMemoryStore.delete(key);
      return null;
    }
    return item.data;
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const key = this.getKey(userId, sessionId);

    if (this.isConnected && this.redis) {
      try {
        await this.redis.del(key);
      } catch (err: any) {
        this.logger.warn(`Redis del failed: ${err.message}`);
      }
    }

    this.inMemoryStore.delete(key);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    if (this.isConnected && this.redis) {
      try {
        const keys = await this.redis.keys(`session:${userId}:*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (err: any) {
        this.logger.warn(`Redis bulk del failed: ${err.message}`);
      }
    }

    for (const key of this.inMemoryStore.keys()) {
      if (key.startsWith(`session:${userId}:`)) {
        this.inMemoryStore.delete(key);
      }
    }
  }
}
