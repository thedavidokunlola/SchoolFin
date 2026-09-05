---
trigger: glob
globs:
  - "src/lib/rate-limit.ts"
  - "src/server/trpc/middleware/**"
  - "src/app/api/**"
---

# rate-limiting.md

> 🔴 All rate limits are hard requirements from PRD §6.7 and §A1.  
> Every listed endpoint must have its limit implemented before the task is complete.

---

## Implementation

🔴 All rate limiting uses `@upstash/ratelimit` with the Redis instance already used for sessions and BullMQ.  
No alternative rate-limiting library. No in-memory rate limiting (does not work across multiple Vercel serverless function instances).

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "rl:login",
});

export const passwordResetRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "60 m"),
  prefix: "rl:password-reset",
});

export const paymentInitiationRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 m"),
  prefix: "rl:payment-initiation",
});

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, "60 s"),
  prefix: "rl:api",
});

export const webhookRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(500, "60 s"),
  prefix: "rl:webhook",
});

export const receiptVerificationRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "60 s"),
  prefix: "rl:receipt-verify",
});
```

---

## Limits by Endpoint

| Endpoint | Limit | Key | Block behaviour |
|---|---|---|---|
| `auth.login` (tRPC) | 5 per IP per 60 seconds | IP | Block for 15 minutes, return HTTP 429 |
| `auth.resetPassword` (tRPC) | 3 per email address per hour | email | Return HTTP 429 with no indication of whether the email exists |
| `payments.initiateOnline` (tRPC) | 10 per parent session per hour | session ID | Return HTTP 429 |
| All tRPC routes (middleware) | 200 per IP per minute | IP | Return HTTP 429 |
| `POST /api/webhooks/flutterwave` | 500 per minute | global | Return HTTP 429 — Flutterwave will retry |
| `GET /verify/receipt/[receiptNumber]` | 60 per IP per minute | IP | Return HTTP 429 |

---

## Login Block Behaviour

🔴 **After 5 failed login attempts from the same IP within 60 seconds:**
1. Return HTTP 429.
2. Block all further login attempts from that IP for 15 minutes.
3. The block applies regardless of which account is being targeted.
4. Log the rate-limit event in AuditLog with action `LOGIN_RATE_LIMITED`.

---

## API-Wide Middleware

🔴 **The 200 req/min/IP limit applies to all tRPC routes via middleware**, applied before the role guard and before any procedure logic runs.

```typescript
// src/server/trpc/middleware/rate-limit.ts
export const apiRateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  const ip = ctx.req.headers["x-forwarded-for"] ?? "unknown";
  const { success } = await apiRateLimit.limit(String(ip));
  if (!success) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
  }
  return next({ ctx });
});
```

---

## Webhook Endpoint

🔴 **The Flutterwave webhook endpoint has its own higher limit (500/min) separate from the API-wide limit.**  
Flutterwave can batch webhook retries. The higher limit prevents legitimate webhook delivery from being blocked by the lower API-wide limit.

The limit key is global (not per IP) because Flutterwave's IP range changes.

---

## What to Do on Rate Limit Hit

🔴 **Return HTTP 429 with a `Retry-After` header specifying the number of seconds until the limit resets.**  
Do not return a 403 (which implies permanent denial) or a 500 (which implies a server error).  
Do not reveal how many attempts remain in the error message.