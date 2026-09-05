// src/lib/redis.ts
// Singleton Redis client for sessions, rate limiting, and caching
// Locked per stack-lock.md

import Redis from "ioredis";
import { config } from "@/lib/config";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

if (!config.isProduction) {
  globalForRedis.redis = redis;
}
