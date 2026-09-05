---
trigger: glob
globs:
  - "worker/**"
  - "src/server/jobs/**"
---

# bullmq-jobs.md

> 🔴 The queue names, job names, schedules, retry policies, and failure behaviours below are locked.  
> No new queues. No renamed jobs. No changed retry counts. No structural changes without explicit sign-off.

---

## The Locked Job Table

| Queue | Job name | Schedule / Trigger | Retries | Backoff | On final failure |
|---|---|---|---|---|---|
| `notifications` | `send-email` | On event | 3 | Exponential: 1 min, 5 min, 15 min | Mark `Notification` FAILED; alert Sentry; in-app bursar alert if no fallback channel |
| `notifications` | `send-sms` | On event | 3 | Exponential: 1 min, 5 min, 15 min | Mark `Notification` FAILED; alert Sentry; in-app bursar alert if no fallback channel |
| `debt-collection` | `run-debt-scan` | Cron: 08:00 WAT Mon–Fri | 0 (no retry) | N/A | Alert Sentry; log to AuditLog |
| `installments` | `check-due-installments` | Cron: 07:00 WAT daily | 0 (no retry) | N/A | Alert Sentry |
| `installments` | `retry-failed-installment` | Triggered 48 hrs after failure notification | 1 | N/A | Flag installment `isFlagged: true`; notify bursar |
| `payments` | `process-flw-webhook` | On webhook receipt | 3 | Exponential: 1 min, 5 min, 15 min | Alert Sentry; log raw payload to AuditLog |
| `receipts` | `generate-receipt-pdf` | On payment success | 2 | N/A | Leave `Receipt.fileUrl = null`; log error to Sentry |
| `payments` | `poll-pending-payments` | Cron: every 15 minutes | 1 | N/A | Alert Sentry; log to AuditLog |
| `reports` | `generate-tax-export` | On 25-second sync timeout | 1 | N/A | Email file to requesting user with error message if 1 retry also fails |

---

## Rule 1 — Job Names Are Locked

🔴 **Use exactly the job names in the table above.** No abbreviations, no camelCase variants, no consolidations.

```typescript
// ✅ CORRECT
await notificationsQueue.add("send-email", { … });
await notificationsQueue.add("send-sms", { … });

// 🔴 WRONG
await notificationsQueue.add("sendEmail", { … });
await notificationsQueue.add("send-notification", { … }); // Consolidation forbidden
```

---

## Rule 2 — Queue Names Are Locked

🔴 **Use exactly the queue names in the table above.**

```typescript
// ✅ CORRECT queue names
const notificationsQueue = new Queue("notifications", { connection: redis });
const debtCollectionQueue = new Queue("debt-collection", { connection: redis });
const installmentsQueue = new Queue("installments", { connection: redis });
const paymentsQueue = new Queue("payments", { connection: redis });
const receiptsQueue = new Queue("receipts", { connection: redis });
const reportsQueue = new Queue("reports", { connection: redis });
```

---

## Rule 3 — Cron Schedules Use WAT (`Africa/Lagos`)

🔴 **All cron-based jobs specify the timezone explicitly:**

```typescript
debtCollectionQueue.add(
  "run-debt-scan",
  {},
  {
    repeat: { pattern: "0 8 * * 1-5", tz: "Africa/Lagos" },
    jobId: "run-debt-scan-cron", // Stable jobId prevents duplicate cron registration
  }
);

installmentsQueue.add(
  "check-due-installments",
  {},
  {
    repeat: { pattern: "0 7 * * *", tz: "Africa/Lagos" },
    jobId: "check-due-installments-cron",
  }
);

paymentsQueue.add(
  "poll-pending-payments",
  {},
  {
    repeat: { pattern: "*/15 * * * *", tz: "Africa/Lagos" },
    jobId: "poll-pending-payments-cron",
  }
);
```

---

## Rule 4 — `poll-pending-payments` Specification

🔴 **This job must implement exactly this logic:**
1. Query all `Payment` records where `status = PENDING` and `createdAt < now() - 10 minutes`.
2. For each: call `PaymentGateway.verifyTransaction(payment.flutterwaveRef)`.
3. If Flutterwave confirms `SUCCESS`:
   - Update `Payment.status = SUCCESS`
   - Credit the student account (via `computeOutstandingBalance` — the credit itself is in `Payment`, the formula reflects it)
   - Create a `Receipt` record with `fileUrl = null`
   - Queue a `generate-receipt-pdf` job
   - Queue a `send-email` and `send-sms` notification (payment confirmation)
   - Write AuditLog entry
4. If Flutterwave confirms `FAILED`:
   - Update `Payment.status = FAILED`
   - Queue payment failure notifications
   - Write AuditLog entry
5. Log the reconciliation run to AuditLog regardless of outcome.

_(PRD §6.5 poll-pending-payments specification)_

---

## Rule 5 — Redis Persistence Configuration

🔴 **Redis must be configured with:**
- RDB snapshots every 15 minutes
- AOF (Append-Only File) logging enabled

This ensures BullMQ job data survives a Redis restart. Without AOF, queued jobs are lost on crash.

_(PRD §6.10)_

---

## Rule 6 — Cron Jobs Do Not Retry

🔴 **`run-debt-scan` and `check-due-installments` have 0 retries.**  
The cron schedule will trigger them again at the next interval. An immediate retry on cron failure could cause double-processing in edge cases.

---

## Rule 7 — Worker Process Is Separate From Next.js

🔴 **BullMQ workers run in the `worker/` process on Railway or Render.**  
No BullMQ worker is registered or started inside `src/` or inside the Next.js application process. The Next.js application only enqueues jobs — it never processes them.

---

## Rule 8 — Job Failure Logging

🔴 **Every BullMQ job registers a `failed` event handler that:**
1. Calls `Sentry.captureException(error)` with the job name and job data in scope.
2. Logs to AuditLog if the failure is a final failure (attempt number equals max attempts).

```typescript
worker.on("failed", (job, error) => {
  Sentry.captureException(error, {
    extra: { jobName: job?.name, jobData: job?.data, attempt: job?.attemptsMade },
  });
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    // Final failure — write to AuditLog
  }
});
```