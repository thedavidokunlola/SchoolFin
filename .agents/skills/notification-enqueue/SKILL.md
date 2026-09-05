---
name: notification-enqueue
description: >
  Load this skill when you hear: "send a notification", "notify the parent", "send a confirmation",
  "trigger an email", "send an SMS", "queue a reminder", "alert the bursar", "send the invite email".
  Applies to every code path that produces a user-facing email or SMS across all phases.
---

## What this skill does
Teaches the ordered pipeline for correctly enqueuing and tracking a notification.
The laws live in: `notification-rules.md`, `bullmq-jobs.md` (notifications queue rows),
`audit-log.md`, AGENTS.md §3 GROUP F (NOTIF-1 through NOTIF-6).
This skill does not restate those laws. It teaches the pipeline order.

---

## Procedure

### Step 1 — Identify the notification type and channel
Use the trigger table in `notification-rules.md` Rule 8 to find:
- Which event triggers this notification
- Which channels are required (Email only, SMS only, or Email + SMS)
- Whether it is triggered by a payment event, a cron job, or a bursar action

Every notification is either `send-email` or `send-sms` in the `notifications` queue.
No other queue. No other job name. Per `notification-rules.md` Rule 1 and `bullmq-jobs.md`.

### Step 2 — Check the SMS monthly cap before enqueuing any SMS job
This check is mandatory before every SMS send attempt, per NOTIF-3 in AGENTS.md
and `notification-rules.md` Rule 4.

```typescript
import { checkSmsCapBeforeSend } from "@/server/services/notifications/sms-cap";

const capStatus = await checkSmsCapBeforeSend();

if (capStatus === "HARD_LIMIT_REACHED") {
  // Do not enqueue. Show in-app bursar alert. Log to AuditLog.
  await writeAuditLog({
    userId: SYSTEM_USER_ID,
    action: AUDIT_ACTIONS.SMS_CAP_REACHED,
    entity: "Notification",
    entityId: studentId,
    metadata: { notificationType, studentId },
  });
  return; // stop — do not proceed to Step 3 for SMS
}

if (capStatus === "WARNING_THRESHOLD_REACHED") {
  // Still send, but also email the proprietor
  await notificationsQueue.add("send-email", {
    to: config.proprietorEmail,
    subject: "SMS usage approaching monthly cap",
    body: "...",
  });
}
```

### Step 3 — Create the Notification record with status QUEUED
Write the `Notification` record to the database before enqueuing the BullMQ job.
This ensures a record exists even if the queue write fails.
Per `notification-rules.md` Rule 6.

```typescript
const notification = await prisma.notification.create({
  data: {
    studentId: studentId,
    channel: channel,           // "EMAIL" or "SMS"
    type: notificationType,     // e.g. "PAYMENT_CONFIRMATION"
    subject: subject ?? null,
    body: renderedBody,
    status: "QUEUED",           // always QUEUED at creation
  },
});
```

### Step 4 — Enqueue the BullMQ job using the exact locked job name
Use `"send-email"` or `"send-sms"`. These are the only valid job names for this queue.
The job data must include the `notificationId` so the handler can update the record's status.

```typescript
await notificationsQueue.add(
  channel === "EMAIL" ? "send-email" : "send-sms",   // exact locked names
  {
    notificationId: notification.id,
    studentId: studentId,
    // include the rendered body here — do not re-render inside the job handler
    to: recipientAddress,
    subject: subject ?? undefined,
    body: renderedBody,
  },
);
```

### Step 5 — The job handler updates status to SENT or FAILED
Inside the BullMQ job handler (not here — this is handled by the `bullmq-job-handler` skill),
the handler calls Termii (SMS) or Resend (email) and then updates the Notification record status.

The caller (this skill) does not need to track the outcome. The job handler owns it.

### Step 6 — Handle final failure: in-app bursar alert when no fallback channel exists
This logic lives in the `failed` event handler on the notifications worker.
Per `notification-rules.md` Rule 3 and NOTIF-2 in AGENTS.md:

After 3 failed attempts, if no fallback channel is available:
1. Mark `Notification.status = "FAILED"`.
2. Write the in-app alert record for the bursar.
3. The alert must persist until dismissed — store in the database, not in application state.
4. Alert text: `"[Student Name]'s parent could not be reached — [notification type] delivery failed. No fallback channel is available. Please contact the parent directly."`

```typescript
// Inside the notifications worker failed handler
const isFinalFailure = job && job.attemptsMade >= 3;
if (isFinalFailure) {
  await prisma.notification.update({
    where: { id: job.data.notificationId },
    data: { status: "FAILED" },
  });

  const hasFallbackChannel = await checkFallbackChannelAvailable(job.data.studentId);
  if (!hasFallbackChannel) {
    await createBursarAlert({
      studentId: job.data.studentId,
      message: `${studentName}'s parent could not be reached — ${job.data.notificationType} delivery failed. No fallback channel is available. Please contact the parent directly.`,
    });
  }
}
```

### Step 7 — For debt collection notifications: check the isPaused flag first
Before running Steps 2–6 for any debt collection triggered notification,
check `Student.automatedMessagesPaused` (or the equivalent flag).
Per NOTIF-6 in AGENTS.md and `notification-rules.md` within the debt collection flow.

```typescript
const student = await prisma.student.findUnique({
  where: { id: studentId },
  select: { automatedMessagesPaused: true },
});

if (student?.automatedMessagesPaused) {
  return; // do not send — log and skip
}
// then proceed to Step 2
```

### Step 8 — For debt collection notifications: check ruleId deduplication
Before enqueuing, check `DebtCollectionEvent` for the same `studentId` + `ruleId`
within the past 7 days. Per NOTIF-5 in AGENTS.md and `debt-collection-engine.md` Rule 4.

```typescript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const recentEvent = await prisma.debtCollectionEvent.findFirst({
  where: {
    studentId: studentId,
    ruleId: ruleId,             // scope to the specific rule — NOT the stage
    sentAt: { gte: sevenDaysAgo },
  },
});

if (recentEvent) {
  return; // already sent for this rule recently — skip
}
```

---

## Code skeleton — payment confirmation notification (Email + SMS)

```typescript
// src/server/services/notifications/send-payment-confirmation.ts
import { prisma } from "@/server/db/prisma";
import { notificationsQueue } from "@/server/jobs/queues";
import { checkSmsCapBeforeSend } from "@/server/services/notifications/sms-cap";
import { renderTemplate } from "@/server/services/notifications/render-template";

export async function sendPaymentConfirmation(params: PaymentConfirmationParams) {
  const { studentId, parentEmail, parentPhone, amount, receiptNumber } = params;

  const emailBody = renderTemplate("payment-confirmation-email", {
    studentFirstName: params.studentFirstName,
    amount,
    receiptNumber,
    paymentLink: config.schoolDomain,
  });

  const smsBody = renderTemplate("payment-confirmation-sms", {
    studentFirstName: params.studentFirstName,
    amount,
  });

  // EMAIL path
  const emailNotification = await prisma.notification.create({  // Step 3
    data: {
      studentId,
      channel: "EMAIL",
      type: "PAYMENT_CONFIRMATION",
      subject: "Payment Confirmation",
      body: emailBody,
      status: "QUEUED",
    },
  });

  await notificationsQueue.add("send-email", {                  // Step 4
    notificationId: emailNotification.id,
    to: parentEmail,
    subject: "Payment Confirmation",
    body: emailBody,
  });

  // SMS path — cap check first
  const capStatus = await checkSmsCapBeforeSend();              // Step 2
  if (capStatus !== "HARD_LIMIT_REACHED") {
    const smsNotification = await prisma.notification.create({  // Step 3
      data: {
        studentId,
        channel: "SMS",
        type: "PAYMENT_CONFIRMATION",
        body: smsBody,
        status: "QUEUED",
      },
    });

    await notificationsQueue.add("send-sms", {                  // Step 4
      notificationId: smsNotification.id,
      to: parentPhone,
      body: smsBody,
    });
  }
}
```

---

## Traps

**Trap 1 — Enqueuing a notification job without creating the Notification record first.**
If the queue write fails, there is no record of the attempted send.
The Notification record must be created with `status: "QUEUED"` before `queue.add()`.

**Trap 2 — Skipping the SMS cap check.**
Sending an SMS when `SMS_MONTHLY_CAP` is reached causes overage billing and
violates the cap enforcement requirement in `notification-rules.md` Rule 4.
The cap check is mandatory before every SMS enqueue.

**Trap 3 — Using a provider other than Termii for SMS or Resend for email.**
NOTIF-1 in AGENTS.md: no substitutions, no fallback to a different provider.
If Termii is down, the job fails and retries. It does not reroute to email.

**Trap 4 — Deduplicating debt collection messages by stage instead of ruleId.**
Deduplicating by `stage` suppresses the new rule if a template was updated mid-term.
The deduplication query must use `ruleId` as the key per NOTIF-5 in AGENTS.md.

**Trap 5 — Storing the in-app bursar alert in application state.**
The alert must persist across logins. Store it in the database.
A bursar who logs out and back in must still see unread alerts.

**Trap 6 — Sending debt collection messages when the student's pause flag is set.**
Check `automatedMessagesPaused` before any debt collection send.
The debt scan job must check this flag per student, per run.

**Trap 7 — Rendering the message body inside the job handler.**
Render the body before enqueuing and include it in the job data.
If rendering fails inside the handler, the retry mechanism retries a broken render loop.

**Trap 8 — Using a job name other than `"send-email"` or `"send-sms"`.**
These are the only two valid job names for the `notifications` queue per `bullmq-jobs.md`.
`"send-notification"` or `"sendEmail"` are build failures.

---

## Verify before done

- [ ] SMS cap check runs before any SMS job is enqueued
- [ ] `Notification` record created with `status: "QUEUED"` before `queue.add()` is called
- [ ] Job names are exactly `"send-email"` and `"send-sms"` — no variants
- [ ] Email goes through Resend; SMS goes through Termii — confirmed in the job handler
- [ ] Final failure path marks `Notification.status = "FAILED"`
- [ ] Final failure with no fallback creates a persisted bursar alert with the exact alert text
- [ ] Debt collection notifications check `automatedMessagesPaused` before enqueuing
- [ ] Debt collection notifications deduplicate by `ruleId`, not by stage
- [ ] Message body is rendered before enqueuing and passed in the job data
- [ ] WhatsApp channel is not used — `NotificationChannel.WHATSAPP` never appears in Phase 0/1/2 code

**Tests to write:**
- Unit test: SMS is not enqueued when cap status is `HARD_LIMIT_REACHED`
- Unit test: proprietor alert email is enqueued when cap status is `WARNING_THRESHOLD_REACHED`
- Unit test: debt collection notification is skipped when `automatedMessagesPaused` is true
- Unit test: debt collection deduplication skips send when same `ruleId` fired within 7 days
- Unit test: deduplication does NOT skip when a different `ruleId` for the same stage fired recently
- Integration test: `Notification` record exists with `status: "QUEUED"` immediately after the call
- Integration test: bursar alert record is created after 3 failed delivery attempts with no fallback