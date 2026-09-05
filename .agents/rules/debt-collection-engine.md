---
trigger: glob
globs:
  - "src/server/jobs/**"
  - "worker/**"
  - "src/server/trpc/router/debt*.ts"
  - "src/server/services/debt*/**"
---

# debt-collection-engine.md

> 🔴 All rules here are hard requirements from PRD §G1, §G2, §G3, and §6.5.

---

## Rule 1 — Cron Schedule Is Fixed

🔴 **The `run-debt-scan` BullMQ job runs at exactly 08:00 WAT (UTC+1), Monday through Friday.**  
It does not run on weekends. It does not run at any other time. The WAT timezone (`Africa/Lagos`) must be used for the cron expression — do not use UTC and offset manually.

```
Cron expression (WAT): 0 8 * * 1-5
```

_(PRD §G2-AC1)_

---

## Rule 2 — Skip Term If `paymentDueDate` Is Not Set

🔴 **Before processing any student in a term, check `AcademicTerm.paymentDueDate`.**  
If `paymentDueDate` is `null`:
1. Log a configuration warning to Sentry with the term ID and name.
2. Skip the entire term.
3. Send no messages for any student in that term.
4. Do not throw an unhandled error — log and continue to the next term.

_(PRD §G2-AC2)_

---

## Rule 3 — Maximum 3 Rules Per Term

🔴 **Each academic term can have at most 3 debt collection rules, one per stage:**
- `REMINDER`
- `ESCALATION`
- `FINAL_NOTICE`

The `DebtCollectionRule` schema enforces `@@unique([termId, stage])`. The application layer must validate this before creating a rule and return a clear error if the stage already has a rule for that term.

_(PRD §G1-AC1)_

---

## Rule 4 — Deduplication Is Scoped to `ruleId`

🔴 **Before sending any debt collection message, check `DebtCollectionEvent` for a record matching both `studentId` and `ruleId` within the past 7 days.**  
If a match is found, skip and do not send.

```typescript
const recentEvent = await prisma.debtCollectionEvent.findFirst({
  where: {
    studentId,
    ruleId,
    sentAt: { gte: sevenDaysAgo },
  },
});
if (recentEvent) return; // Skip — already sent for this rule recently
```

🔴 **Do not deduplicate by `stage` alone.**  
If a rule's template is updated mid-term (creating a new `ruleId`), the new rule must fire even within 7 days of the old rule firing. Stage-based deduplication would incorrectly suppress this.

_(PRD §G2-AC7)_

---

## Rule 5 — Respect the Per-Student Pause Flag

🔴 **If a student has automated messages paused (`Student.isPaused` or the equivalent flag), do not send any debt collection message for that student.**

The check occurs inside the job, per student, before any template rendering or send attempt.

```typescript
if (student.automatedMessagesPaused) {
  continue; // Skip this student
}
```

_(PRD §G2-AC4)_

---

## Rule 6 — Days Overdue Tolerance

🔴 **The debt scan matches a rule if the student's days overdue falls within ±1 day of the rule's `daysOverdue` threshold.**  
Days overdue is calculated from `AcademicTerm.paymentDueDate` to the current date.

```typescript
const daysOverdue = differenceInDays(new Date(), term.paymentDueDate);
const isMatch = Math.abs(daysOverdue - rule.daysOverdue) <= 1;
```

_(PRD §G2-AC3)_

---

## Rule 7 — Template Variable Substitution

🔴 **The message body substitutes exactly these variables:**
- `{{studentFirstName}}` — `Student.firstName`
- `{{outstandingBalance}}` — formatted NGN amount from `computeOutstandingBalance`
- `{{dueDate}}` — `AcademicTerm.paymentDueDate` formatted as `DD/MM/YYYY`
- `{{paymentLink}}` — the parent portal payment URL for the school

🔴 **No other template variables exist in v1.** If a template contains an unrecognised variable (`{{somethingElse}}`), log a Sentry warning and send the message with the unresolved placeholder visible rather than failing silently.

_(PRD §G2-AC6)_

---

## Rule 8 — Every Sent Message Gets a DebtCollectionEvent Record

🔴 **Every message sent by the debt engine writes a `DebtCollectionEvent` record with:**
- `studentId`
- `ruleId` — the specific rule that triggered the send
- `stage` — the rule's stage
- `channel` — EMAIL or SMS
- `message` — the rendered message body
- `sentAt` — the timestamp of the send attempt
- `status` — QUEUED, SENT, or FAILED

_(PRD §G2-AC5)_

---

## Rule 9 — Pause and Resume Are Logged in AuditLog

🔴 **When the bursar pauses automated messages for a student, write an AuditLog entry with:**
- `action: AUDIT_ACTIONS.AUTOMATED_MESSAGES_PAUSED`
- `entity: "Student"`
- `entityId: studentId`
- `metadata: { pausedById: bursarUserId }`

Resume is also logged with `action: AUDIT_ACTIONS.AUTOMATED_MESSAGES_RESUMED`.

_(PRD §G3-AC2, §G3-AC4)_

---

## Rule 10 — Cron Failure Handling

🔴 **If the `run-debt-scan` job fails entirely (unhandled error):**
1. Alert Sentry with the full error.
2. Write a failure record to AuditLog with `action: AUDIT_ACTIONS.DEBT_SCAN_FAILED`.
3. Do not retry (the cron will reschedule for the next day).
4. The bursar is not automatically notified — Sentry is the alert mechanism for cron failures.

_(PRD §6.5)_