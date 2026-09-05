---
trigger: always_on
---

# folder-structure.md

> 🔴 = Breaking this rule means the task failed, even if the code works.  
> 🟡 = Strong guidance. Document deviations in the completion checklist.

---

## Authoritative Layout

```
schoolfin/
├── AGENTS.md
├── school.config.ts             ← non-secret school-specific config
├── .env                         ← secrets, never committed
├── .env.example                 ← all required keys, no values
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/                     ← Next.js App Router
│   │   ├── (auth)/              ← login, reset, invite acceptance
│   │   ├── (parent)/
│   │   ├── (bursar)/
│   │   ├── (accountant)/
│   │   ├── (proprietor)/
│   │   ├── api/
│   │   │   └── webhooks/
│   │   │       └── flutterwave/ ← POST handler only
│   │   └── verify/
│   │       └── receipt/[receiptNumber]/  ← public, unauthenticated
│   ├── server/
│   │   ├── trpc/
│   │   │   ├── router/          ← one file per router
│   │   │   ├── middleware/      ← role-guard, session validation
│   │   │   └── index.ts         ← root router
│   │   ├── services/
│   │   │   ├── payment-gateway/ ← interface + FlutterwaveAdapter ONLY
│   │   │   ├── notifications/   ← Resend + Termii modules
│   │   │   ├── encryption/      ← AES-256 encrypt/decrypt
│   │   │   └── balance/         ← computeOutstandingBalance
│   │   ├── jobs/                ← one file per BullMQ job type
│   │   └── db/
│   │       └── prisma.ts        ← singleton Prisma client
│   ├── components/
│   │   ├── ui/                  ← shared primitives
│   │   ├── receipt/             ← react-to-print receipt layout
│   │   └── [feature]/
│   ├── lib/
│   │   ├── config.ts            ← validated env vars (single read point)
│   │   ├── auth.ts              ← NextAuth.js configuration
│   │   ├── rate-limit.ts        ← Upstash configurations
│   │   ├── audit.ts             ← AuditLog write helper (ONLY path to AuditLog)
│   │   └── constants.ts         ← enums, role lists, action strings
│   └── types/
│       └── index.ts
├── worker/                      ← separate process, Railway/Render only
│   ├── index.ts
│   └── queues/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## Hard Boundaries

### Boundary 1 — Puppeteer is `worker/` only

🔴 `puppeteer`, `puppeteer-core`, and `@sparticuz/chromium` must **never** appear in any import inside `src/`.

Vercel serverless functions cannot run Puppeteer. If it is imported anywhere in `src/`, the deployment will succeed but receipt generation will crash at runtime during a live payment — a critical production failure.

**Enforcement:** Add this ESLint rule to the project:
```json
{
  "no-restricted-imports": [
    "error",
    {
      "paths": [
        { "name": "puppeteer", "message": "Puppeteer runs in worker/ only. Never import it in src/." },
        { "name": "puppeteer-core", "message": "Puppeteer runs in worker/ only." },
        { "name": "@sparticuz/chromium", "message": "Chromium runs in worker/ only." }
      ]
    }
  ]
}
```
This rule applies to all files under `src/`. It does not apply under `worker/`.

**What to do instead:** Queue a `generate-receipt-pdf` BullMQ job from `src/`. The worker picks it up and runs Puppeteer.

---

### Boundary 2 — Flutterwave SDK is `payment-gateway/` only

🔴 Nothing outside `src/server/services/payment-gateway/` imports from the Flutterwave SDK, calls a Flutterwave URL, or reads `FLUTTERWAVE_SECRET_KEY` directly.

All payment operations go through the `PaymentGateway` interface:

```typescript
// src/server/services/payment-gateway/interface.ts
export interface PaymentGateway {
  initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
  verifyTransaction(ref: string): Promise<TransactionVerificationResult>;
  tokeniseCard(ref: string): Promise<string | null>;
  chargeToken(token: string, params: ChargeTokenParams): Promise<ChargeResult>;
}
```

The `FlutterwaveAdapter` in the same folder implements this interface. Everything else depends on the interface, never the adapter directly.

**Why:** PRD §8 explicitly calls for this abstraction to allow swapping to Paystack or another provider with changes confined to one module. A direct SDK import anywhere else makes that impossible.

---

### Boundary 3 — AuditLog writes go through `audit.ts` only

🔴 No file calls `prisma.auditLog.create(…)` directly.  
All audit writes go through `src/lib/audit.ts`:

```typescript
// src/lib/audit.ts — only allowed shape
export async function writeAuditLog(entry: AuditLogEntry): Promise<void>
```

**Why:** `audit.ts` enforces the `isSensitive` flag logic, the required field contract, and will be the single place to add future compliance hooks. A direct `prisma.auditLog.create` bypass skips all of that silently.

---

### Boundary 4 — Balance computation is `balance/` only

🔴 No component, tRPC procedure, BullMQ job, or report function computes an outstanding balance inline.  
All balance calculations call `computeOutstandingBalance` from `src/server/services/balance/`.

**Why:** If the formula is duplicated, the two copies will diverge. The debtor list will show a different number than the student profile. Parents and bursars will lose trust in the system.

---

### Boundary 5 — `prisma.ts` is the only Prisma client instantiation

🔴 The Prisma client is instantiated once in `src/server/db/prisma.ts` as a singleton and imported everywhere else. Never call `new PrismaClient()` anywhere else.

---

## File Placement Rules

🟡 Route handlers in `src/app/` are thin. They call tRPC or a server action. They contain no business logic.

🟡 tRPC routers in `src/server/trpc/router/` are thin. One file per router matching the names in PRD §6.3.

🟡 Service files in `src/server/services/` own all business logic. Sub-folder per domain concern.

🟡 One BullMQ job type per file in `src/server/jobs/`. Job names match PRD §6.5 exactly.

🟡 Shared UI components in `src/components/ui/`. Feature-specific components in `src/components/[feature]/`.

---

## What Belongs in `school.config.ts` vs `.env`

| Value type | Location |
|---|---|
| School name, logo URL, address, phone | `school.config.ts` |
| Timezone, currency, term structure, SMS cap | `school.config.ts` |
| API keys, secrets, database URLs, Redis URL | `.env` only |
| Encryption keys | `.env` only |

`.env` is never committed. `.env.example` lists every required key with no values and is committed.