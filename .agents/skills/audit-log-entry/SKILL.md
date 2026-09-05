---
name: audit-log-entry
description: >
  Load this skill when you hear: "write an audit entry", "log this action", "record in audit log",
  or whenever you are about to complete any function that creates, updates, or changes the status
  of any database record. Also load when implementing a webhook handler before job enqueue.
  Applies to every file that calls writeAuditLog().
---

## What this skill does
Teaches the decision sequence for writing a correct, complete AuditLog entry every time.
The laws live in: `audit-log.md`, AGENTS.md §3 GROUP C (AUDIT-1 through AUDIT-6),
`prisma-schema.md` (AuditLog is append-only), and `coding-standards.md` (no silent catch).
This skill does not restate those laws. It teaches the decision order.

---

## Procedure

### Step 1 — Confirm an audit entry is required for this action
Every create, update, or status-change action requires one. Per `audit-log.md` Rule 1,
the list of required actions is illustrative, not exhaustive — if you are modifying state,
you need an entry. When in doubt, write one.

Ask: "Am I changing a record in the database right now?"
Yes → continue to Step 2.
No (pure read) → no audit entry needed. Stop.

### Step 2 — Identify the correct AUDIT_ACTIONS constant
Open `src/lib/constants.ts` and pick the matching constant.
Never write a free-form string. `"MANUAL_CREDIT_CREATED"` and `"ManualCreditCreated"`
must not both exist in the log.

If no constant exists for this action yet, add it to `AUDIT_ACTIONS` in `constants.ts` first.
Follow the naming pattern: `NOUN_VERB` in SCREAMING_SNAKE_CASE.

### Step 3 — Determine whether isSensitive is true
Check the sensitivity table in `audit-log.md` Rule 5:

| Constant | isSensitive |
|---|---|
| MANUAL_CREDIT_CREATED | true |
| PAYMENT_REFUNDED | true |
| USER_ROLE_CHANGED | true |
| FEE_WAIVER_APPLIED | true |
| OVERPAYMENT_OVERRIDE | true |
| DUPLICATE_PAYMENT_CONFIRMED | true |
| Everything else | false (default) |

### Step 4 — Determine whether a transaction client (tx) is available
Is the audit write happening inside a `prisma.$transaction()` block?

**Yes → pass `tx` as the second argument to `writeAuditLog`.** This makes the audit
write atomic with the action it records. If the transaction rolls back, the audit entry
rolls back too — which is correct, because the action did not happen.

**No → call `writeAuditLog` immediately after the action, with no `tx` argument.**
Do not batch it. Do not defer it with `setTimeout` or `setImmediate`.
Do not `await` it after a `return` statement — it will never execute.

### Step 5 — Build the metadata object
Include the fields a future reader needs to understand exactly what changed.
For creates: include the new record's ID and the key field values.
For updates: include the changed fields and their before/after values where possible.
For bulk actions: include the full list of affected entity IDs.

Do not include raw secrets, passwords, encryption keys, or unencrypted card tokens
in metadata — per `encryption.md` Rule 7 and SEC-3 in AGENTS.md.

### Step 6 — Call writeAuditLog
`writeAuditLog` in `src/lib/audit.ts` is the only permitted path.
Never call `prisma.auditLog.create()` directly per `audit-log.md` Rule 2.

```typescript
await writeAuditLog({
  userId: actingUserId,           // the human who triggered the action
  action: AUDIT_ACTIONS.THE_ACTION,
  entity: "ModelName",            // Prisma model name, e.g. "FeePosting"
  entityId: record.id,
  metadata: { /* key fields */ },
  isSensitive: false,             // or true — from Step 3
}, tx);                           // tx from Step 4, or omit if no transaction
```

### Step 7 — Special case: webhook handler
Per `audit-log.md` Rule 6 and AUDIT-4 in AGENTS.md:
Write the raw payload to AuditLog **before** enqueuing the BullMQ job.
Use `SYSTEM_USER_ID` as the `userId` for automated actions.

```typescript
// POST /api/webhooks/flutterwave
// Step 1: verify signature (see flutterwave-integration.md Rule 1)
// Step 2: write audit log with raw payload BEFORE queuing
await writeAuditLog({
  userId: SYSTEM_USER_ID,
  action: AUDIT_ACTIONS.WEBHOOK_RECEIVED,
  entity: "FlutterwaveWebhook",
  entityId: payload.data.tx_ref,
  metadata: { rawPayload: payload },
});
// Step 3: enqueue the BullMQ job
await webhookQueue.add("process-flw-webhook", { payload });
// Step 4: return 200 immediately
return new Response("OK", { status: 200 });
```

---

## Code skeleton — audit write inside a transaction

```typescript
// src/server/services/payments/record-manual-credit.ts
import { prisma } from "@/server/db/prisma";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";

export async function recordManualCredit(input: ManualCreditInput) {
  return await prisma.$transaction(async (tx) => {
    const credit = await tx.manualCredit.create({
      data: {
        studentId: input.studentId,
        amount: input.amount,          // Decimal — never float
        description: input.description,
        recordedById: input.recordedById,
      },
    });

    await writeAuditLog(
      {
        userId: input.recordedById,
        action: AUDIT_ACTIONS.MANUAL_CREDIT_CREATED,  // Step 2
        entity: "ManualCredit",
        entityId: credit.id,
        metadata: {
          amount: credit.amount,
          studentId: credit.studentId,
          description: credit.description,
        },
        isSensitive: true,              // Step 3 — always true for manual credits
      },
      tx,                               // Step 4 — inside transaction
    );

    return credit;
  });
}
```

## Code skeleton — audit write outside a transaction

```typescript
// When no transaction is in scope
const term = await prisma.academicTerm.update({
  where: { id: input.termId },
  data: { isActive: true },
});

await writeAuditLog({                   // immediately after, never deferred
  userId: input.userId,
  action: AUDIT_ACTIONS.TERM_SET_ACTIVE,
  entity: "AcademicTerm",
  entityId: term.id,
  metadata: { termName: term.name },
  isSensitive: false,
});
```

---

## Traps

**Trap 1 — Calling `prisma.auditLog.create()` directly.**
The only permitted path is `writeAuditLog()` from `src/lib/audit.ts`.
Direct Prisma calls bypass the `isSensitive` logic and the required field contract.

**Trap 2 — Placing the `writeAuditLog` call after `return`.**
It will never execute. The audit write must come before the return statement,
inside the transaction block or immediately after the awaited action.

**Trap 3 — Omitting `tx` when inside a `prisma.$transaction()` block.**
Without `tx`, the audit write runs on the main connection outside the transaction.
If the transaction rolls back (e.g., a constraint violation), the audit entry persists
even though the action did not happen. This is a false audit record.

**Trap 4 — Using a free-form string for `action`.**
`action: "manual_credit_created"` is a violation. Use `AUDIT_ACTIONS.MANUAL_CREDIT_CREATED`.
If the constant does not exist yet, add it to `constants.ts` in Step 2.

**Trap 5 — Missing isSensitive: true on a sensitive action.**
The proprietor's audit log viewer filters by `isSensitive`. Missing the flag means the
proprietor cannot find the record when reviewing a disputed credit.
Check the table in Step 3 for every audit write.

**Trap 6 — Batching or deferring audit writes for performance.**
`audit-log.md` Rule 3 explicitly forbids this. The overhead of one synchronous write
is acceptable. A missing audit entry on a ₦500,000 credit is not.

**Trap 7 — Logging raw secrets in metadata.**
Never include `ENCRYPTION_KEY`, raw card tokens, `FLUTTERWAVE_SECRET_KEY`,
or any hashed password in `metadata`. Mask as `[REDACTED]` if the field must appear.

---

## Verify before done

- [ ] Every state-changing function in this task has a corresponding `writeAuditLog` call
- [ ] All `action` values use `AUDIT_ACTIONS` constants from `constants.ts` — no free-form strings
- [ ] `isSensitive: true` is set for every action in the sensitivity table (Step 3)
- [ ] `writeAuditLog` is called with `tx` wherever the write is inside a `prisma.$transaction()`
- [ ] No `writeAuditLog` call appears after a `return` statement
- [ ] Webhook handler writes raw payload to AuditLog before enqueuing the BullMQ job
- [ ] No secrets, passwords, or raw card tokens appear in any `metadata` field
- [ ] `prisma.auditLog.create()` does not appear anywhere in the codebase touched by this task

**Tests to write:**
- Unit test: `writeAuditLog` is called with the correct `action` constant for each
  state-changing operation
- Unit test: `isSensitive` is `true` for each action in the sensitivity table
- Integration test: AuditLog record exists with correct fields after a successful transaction
- Integration test: AuditLog record does NOT exist when the surrounding transaction rolls back
  (confirms `tx` was passed correctly)
- Integration test: webhook handler writes AuditLog before the BullMQ job is enqueued