// src/lib/redis.ts
// Singleton Redis client for sessions, rate limiting, and caching
// Includes resilient in-memory fallback for local development when standalone Redis daemon is offline

import Redis from "ioredis";
import { config } from "@/lib/config";

// In-memory fallback map with TTL tracking
interface MemoryItem {
  value: string;
  expiresAt: number | null;
}
const memoryStore = new Map<string, MemoryItem>();

function getFromMemory(key: string): string | null {
  const item = memoryStore.get(key);
  if (!item) return null;
  if (item.expiresAt && Date.now() > item.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return item.value;
}

function setToMemory(key: string, value: string, seconds?: number) {
  memoryStore.set(key, {
    value,
    expiresAt: seconds ? Date.now() + seconds * 1000 : null,
  });
}

function delFromMemory(key: string) {
  memoryStore.delete(key);
}

const globalForRedis = globalThis as unknown as {
  realRedis: Redis | undefined;
};

let isRedisConnected = false;

const realRedis =
  globalForRedis.realRedis ??
  new Redis(config.redis.url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
      if (!config.isProduction && times > 2) {
        return null; // Stop polling in dev when offline
      }
      return Math.min(times * 1000, 3000);
    },
  });

realRedis.on("connect", () => {
  isRedisConnected = true;
});

realRedis.on("error", () => {
  isRedisConnected = false;
});

if (!config.isProduction) {
  globalForRedis.realRedis = realRedis;
}

// Proxied Redis client that falls back gracefully to in-memory store if Redis daemon is offline
export const redis = new Proxy(realRedis as any, {
  get(target, prop, receiver) {
    if (prop === "get") {
      return async (key: string) => {
        if (isRedisConnected) {
          try {
            return await target.get(key);
          } catch {
            return getFromMemory(key);
          }
        }
        return getFromMemory(key);
      };
    }

    if (prop === "set") {
      return async (key: string, value: string, ...args: any[]) => {
        let ttlSeconds: number | undefined;
        if (args[0] === "EX" && typeof args[1] === "number") {
          ttlSeconds = args[1];
        }
        setToMemory(key, value, ttlSeconds);

        if (isRedisConnected) {
          try {
            return await target.set(key, value, ...args);
          } catch {
            return "OK";
          }
        }
        return "OK";
      };
    }

    if (prop === "del") {
      return async (key: string) => {
        delFromMemory(key);
        if (isRedisConnected) {
          try {
            return await target.del(key);
          } catch {
            return 1;
          }
        }
        return 1;
      };
    }

    const value = Reflect.get(target, prop, receiver);
    if (typeof value === "function") {
      return value.bind(target);
    }
    return value;
  },
});
