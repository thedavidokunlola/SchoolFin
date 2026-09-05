// src/lib/rate-limit.ts
// Rate limiting configuration per PRD §6.7 and rate-limiting.md

import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

// Custom adapter bridging ioredis to Upstash Ratelimit interface
const redisAdapter = {
  sadd: async (key: string, ...members: (string | number)[]) => {
    return await redis.sadd(key, ...members);
  },
  eval: async <TArgs extends (string | number)[], TReturn>(
    script: string,
    keys: string[],
    args: TArgs,
  ): Promise<TReturn> => {
    return (await redis.eval(script, keys.length, ...keys, ...args)) as TReturn;
  },
};

export const loginRateLimit = new Ratelimit({
  // @ts-expect-error adapter satisfies Upstash Redis interface requirements
  redis: redisAdapter,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "rl:login",
});

export const passwordResetRateLimit = new Ratelimit({
  // @ts-expect-error adapter satisfies Upstash Redis interface requirements
  redis: redisAdapter,
  limiter: Ratelimit.slidingWindow(3, "60 m"),
  prefix: "rl:password-reset",
});

export const paymentInitiationRateLimit = new Ratelimit({
  // @ts-expect-error adapter satisfies Upstash Redis interface requirements
  redis: redisAdapter,
  limiter: Ratelimit.slidingWindow(10, "60 m"),
  prefix: "rl:payment-initiation",
});

export const apiRateLimit = new Ratelimit({
  // @ts-expect-error adapter satisfies Upstash Redis interface requirements
  redis: redisAdapter,
  limiter: Ratelimit.slidingWindow(200, "60 s"),
  prefix: "rl:api",
});

export const webhookRateLimit = new Ratelimit({
  // @ts-expect-error adapter satisfies Upstash Redis interface requirements
  redis: redisAdapter,
  limiter: Ratelimit.slidingWindow(500, "60 s"),
  prefix: "rl:webhook",
});

export const receiptVerificationRateLimit = new Ratelimit({
  // @ts-expect-error adapter satisfies Upstash Redis interface requirements
  redis: redisAdapter,
  limiter: Ratelimit.slidingWindow(60, "60 s"),
  prefix: "rl:receipt-verify",
});
