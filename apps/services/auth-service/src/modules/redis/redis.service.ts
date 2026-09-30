import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { appConfig } from "@banking/config";
import { createLogger } from "@banking/logger";
import { RedisSessionData } from "@banking/shared-types";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private logger = createLogger("AuthRedisService");
  private fallbackMemoryStore = new Map<
    string,
    { value: string; expiresAt: number }
  >();

  constructor() {
    try {
      this.client = new Redis(appConfig.redis.url, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // don't infinite retry if Redis is offline
        enableOfflineQueue: false,
      });

      this.client.on("connect", () => {
        this.logger.info("Connected to Redis server");
      });

      this.client.on("error", (err) => {
        this.logger.warn(
          `Redis connection issue, utilizing in-memory fallback store: ${err.message}`,
        );
      });
    } catch (error: any) {
      this.logger.warn(`Failed to initialize Redis client: ${error?.message}`);
      this.client = null;
    }
  }

  async setSession(
    userId: string,
    session: RedisSessionData,
    ttlSeconds = 604800,
  ): Promise<void> {
    const key = `session:${userId}`;
    const value = JSON.stringify(session);
    if (this.client && this.client.status === "ready") {
      await this.client.set(key, value, "EX", ttlSeconds);
    } else {
      this.fallbackMemoryStore.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }
  }

  async getSession(userId: string): Promise<RedisSessionData | null> {
    const key = `session:${userId}`;
    if (this.client && this.client.status === "ready") {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } else {
      const entry = this.fallbackMemoryStore.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        this.fallbackMemoryStore.delete(key);
        return null;
      }
      return JSON.parse(entry.value);
    }
  }

  async deleteSession(userId: string): Promise<void> {
    const key = `session:${userId}`;
    if (this.client && this.client.status === "ready") {
      await this.client.del(key);
    } else {
      this.fallbackMemoryStore.delete(key);
    }
  }

  async blacklistToken(token: string, ttlSeconds = 900): Promise<void> {
    const key = `blacklist:${token}`;
    if (this.client && this.client.status === "ready") {
      await this.client.set(key, "1", "EX", ttlSeconds);
    } else {
      this.fallbackMemoryStore.set(key, {
        value: "1",
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`;
    if (this.client && this.client.status === "ready") {
      const exists = await this.client.exists(key);
      return exists === 1;
    } else {
      const entry = this.fallbackMemoryStore.get(key);
      if (!entry) return false;
      if (Date.now() > entry.expiresAt) {
        this.fallbackMemoryStore.delete(key);
        return false;
      }
      return true;
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }
}
