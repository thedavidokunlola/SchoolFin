---
name: bullmq-job-handler
description: >
  Load this skill when you hear: "implement a job", "write a worker", "add a job handler",
  "process the queue", "build the worker for", "handle the BullMQ job".
  Applies to every file created inside src/server/jobs/ or worker/queues/.
  Also load when registering a new cron schedule.
---

## What this skill does
Teaches the ordered structure of a correct BullMQ job handler.
The laws live in: `bullmq-jobs.md`, `audit-log.md` (Rule 3 and Rule 10),
`folder-structure.md` (Boundary 1 — Puppeteer in worker/ only),
AGENTS.md §2.5 and §3 GROUP C AUDIT-1.
This skill does not restate those laws. It teaches the handler assembly order.

---

## Procedure

### Step 1 — Confirm the job name and queue name against the locked table
Open `bullmq-jobs.md` and find the row for this job.
Copy the queue name and job name exactly. No abbreviations, no camelCase variants.
If the job is not in the table, stop and ask — do not invent a new queue.
Queue name examples (exact): notifications | debt-collection | installments | payments | receipts | reports
Job name examples (exact): send-email | run-debt-scan | process-flw-webhook | generate-receipt-pdf

### Step 2 — Confirm the retry policy and failure behaviour
Read the locked table row for this job:
- How many retries? (0, 1, 2, or 3)
- Is exponential backoff specified? (notifications jobs: yes — 1 min, 5 min, 15 min)
- What happens on final failure? (Sentry alert? AuditLog write? In-app bursar alert?)

Record these before writing any code. They shape Step 5 and Step 6.

### Step 3 — Write the idempotency guard at the top of the processor
For jobs that process external events (webhooks, payment verification), check whether
the work has already been done before running any logic.
Place this check as the very first operation in the processor function.

```typescript
// process-flw-webhook.ts
async function processFlwWebhook(job: Job<WebhookJobData>) {
  // IDEMPOTENCY FIRST — before any other logic
  const existing = await prisma.payment.findUnique({
    where: { flutterwaveRef: job.data.payload.data.tx_ref },
    select: { status: true },
  });
  if (existing?.status === "SUCCESS") {
    await writeAuditLog({
      userId: SYSTEM_USER_ID,
      action: AUDIT_ACTIONS.WEBHOOK_DUPLICATE_DISCARDED,
      entity: "Payment",
      entityId: job.data.payload.data.tx_ref,
      metadata: {},
    });
    return; // discard duplicate — do not reprocess
  }

  // business logic follows here
}
```

### Step 4 — Write the business logic
Call service functions from `src/server/services/`. Do not inline business logic in the handler.
For jobs that involve monetary amounts, every value must remain `Decimal` — load `money-handling.md`.
For jobs that write notifications, load the `notification-enqueue` skill.

### Step 5 — Write the AuditLog entry on success
Load the `audit-log-entry` skill and execute it for the job's successful outcome.
For cron jobs that complete without error, write a success record with an appropriate action constant.

### Step 6 — Register the failed event handler
This is mandatory for every worker. Per `bullmq-jobs.md` Rule 8:
1. Call `Sentry.captureException(error)` with job name and job data in scope.
2. If this is the final failure attempt (attempts made equals max attempts), write to AuditLog.
3. Execute the on-final-failure behaviour from the locked table (in-app alert, email user, flag installment, etc.).

```typescript
worker.on("failed", async (job, error) => {
  Sentry.captureException(error, {
    extra: {
      jobName: job?.name,
      jobData: job?.data,
      attempt: job?.attemptsMade,
    },
  });

  const isFinalFailure = job && job.attemptsMade >= (job.opts.attempts ?? 1);
  if (isFinalFailure) {
    await writeAuditLog({
      userId: SYSTEM_USER_ID,
      action: AUDIT_ACTIONS.JOB_FINAL_FAILURE,   // add this constant to constants.ts
      entity: "BullMQJob",
      entityId: job.id ?? "unknown",
      metadata: { jobName: job.name, error: error.message },
    });
    // execute the locked on-final-failure behaviour for this specific job
  }
});
```

### Step 7 — For cron jobs: add timezone and stable jobId
Cron jobs require two additional fields that triggered jobs do not:
- `tz: "Africa/Lagos"` — always WAT, never UTC per `bullmq-jobs.md` Rule 3
- `jobId: "job-name-cron"` — a stable string that prevents duplicate cron registration
  on worker restart

```typescript
debtCollectionQueue.add(
  "run-debt-scan",          // exact locked job name
  {},
  {
    repeat: {
      pattern: "0 8 * * 1-5",     // 08:00 WAT Mon–Fri
      tz: "Africa/Lagos",          // mandatory — never omit
    },
    jobId: "run-debt-scan-cron",   // stable — prevents duplicate on restart
  },
);
```

### Step 8 — For Puppeteer jobs: confirm file location
If this job uses Puppeteer (only `generate-receipt-pdf`), confirm the handler file
is inside `worker/` and not inside `src/`.
Puppeteer imports are forbidden in `src/` per `folder-structure.md` Boundary 1.
The ESLint rule in the project enforces this, but confirm manually.

### Step 9 — Register the worker with the correct queue connection
Use the Redis singleton. Do not create a new Redis connection per worker.

```typescript
import { Worker } from "bullmq";
import { redis } from "@/lib/redis";

const worker = new Worker(
  "notifications",                   // exact locked queue name
  async (job) => {
    if (job.name === "send-email") {
      await processSendEmail(job);
    }
  },
  {
    connection: redis,
    concurrency: 5,
  },
);
```

---

## Code skeleton — full triggered job handler

```typescript
// src/server/jobs/process-flw-webhook.ts
import { Worker, Job } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/server/db/prisma";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import * as Sentry from "@sentry/node";

const SYSTEM_USER_ID = "system";

async function processFlwWebhook(job: Job<WebhookJobData>) {
  // Step 3: idempotency guard
  const existing = await prisma.payment.findUnique({
    where: { flutterwaveRef: job.data.payload.data.tx_ref },
    select: { status: true },
  });
  if (existing?.status === "SUCCESS") {
    return;
  }

  // Step 4: business logic via service
  await prisma.$transaction(async (tx) => {
    const result = await handlePaymentSuccess(job.data.payload, tx);

    // Step 5: audit on success
    await writeAuditLog({
      userId: SYSTEM_USER_ID,
      action: AUDIT_ACTIONS.PAYMENT_SUCCESS,
      entity: "Payment",
      entityId: result.paymentId,
      metadata: { flutterwaveRef: job.data.payload.data.tx_ref },
    }, tx);
  });
}

const worker = new Worker("payments", processFlwWebhook, { connection: redis });

// Step 6: failed handler — mandatory
worker.on("failed", async (job, error) => {
  Sentry.captureException(error, {
    extra: { jobName: job?.name, attempt: job?.attemptsMade },
  });

  const isFinalFailure = job && job.attemptsMade >= (job.opts.attempts ?? 1);
  if (isFinalFailure) {
    await writeAuditLog({
      userId: SYSTEM_USER_ID,
      action: AUDIT_ACTIONS.JOB_FINAL_FAILURE,
      entity: "BullMQJob",
      entityId: job?.id ?? "unknown",
      metadata: { jobName: job?.name, error: error.message },
    });
  }
});
```

---

## Traps

**Trap 1 — Using a job name or queue name not in the locked table.**
`bullmq-jobs.md` Rule 1 and Rule 2: names are locked. `"sendEmail"` instead of `"send-email"`
is a build failure. Copy from the table exactly.

**Trap 2 — Skipping the idempotency guard on webhook and payment jobs.**
Without it, a duplicate webhook credits the student account twice.
The idempotency check is the first line of the processor — not optional, not conditional.

**Trap 3 — Omitting the `failed` event handler.**
A worker without a `failed` handler silently swallows final failures.
Sentry never fires. The AuditLog has no record. The bursar is never alerted.
Every worker needs the handler.

**Trap 4 — Cron job without `tz: "Africa/Lagos"`.**
Omitting the timezone defaults to UTC. The debt scan would fire at 07:00 WAT in winter
and 08:00 WAT in summer. Per `bullmq-jobs.md` Rule 3, the timezone is mandatory.

**Trap 5 — Cron job without a stable `jobId`.**
Without a stable `jobId`, every worker restart registers a new duplicate cron entry in Redis.
The job fires multiple times per scheduled interval.

**Trap 6 — Importing Puppeteer inside `src/`.**
`folder-structure.md` Boundary 1: Puppeteer only inside `worker/`.
If a job that requires PDF generation is being built as a file under `src/server/jobs/`,
the Puppeteer work must be delegated to a handler file under `worker/`.

**Trap 7 — Putting business logic directly in the job processor function.**
The processor calls service functions. All logic lives in `src/server/services/`.
A processor body that is more than ~15 lines (excluding the idempotency guard and audit write)
is a warning sign.

**Trap 8 — Cron jobs set with retry count > 0.**
`run-debt-scan` and `check-due-installments` have 0 retries per `bullmq-jobs.md` Rule 6.
The cron schedule re-triggers them. An immediate retry risks double-processing.

---

## Verify before done

- [ ] Queue name and job name match the locked table in `bullmq-jobs.md` exactly
- [ ] Retry count matches the locked table row for this job
- [ ] Idempotency guard is the first operation in the processor (for event-driven jobs)
- [ ] Business logic is in a service function — not inline in the processor
- [ ] `failed` event handler is registered and calls `Sentry.captureException`
- [ ] `failed` handler writes to AuditLog on final failure
- [ ] `failed` handler executes the on-final-failure behaviour from the locked table
- [ ] Cron jobs have `tz: "Africa/Lagos"` and a stable `jobId`
- [ ] Puppeteer imports do not appear in any file under `src/`
- [ ] Worker uses the Redis singleton — no new connection created
- [ ] `tsc --noEmit` passes with zero errors

**Tests to write:**
- Unit test: processor returns early (no state change) when idempotency guard matches
- Unit test: processor calls the correct service function for valid job data
- Integration test: `failed` event fires Sentry and writes AuditLog on final failure
- Integration test: cron job does not register a duplicate entry when the worker restarts
- Integration test: a successfully processed job results in the correct database state
  and AuditLog record