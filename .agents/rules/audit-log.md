---
trigger: glob
globs:
  - "src/lib/audit.ts"
  - "src/server/**"
  - "src/app/api/**"
---

# audit-log.md

> 🔴 Every rule here is a hard requirement.  
> A feature that works but skips an audit write is a failed task.

---

## Rule 1 — Every State Change Gets an Audit Record

🔴 **Every action that creates, updates, or changes the status of any record writes an `AuditLog` entry before the function returns.**

This includes, but is not limited to:
- Login (success and failure)
- Password reset
- Session creation and destruction
- Parent account creation
- Student creation, update, deactivation
- Student–parent link and unlink
- Fee structure creation, update, deactivation
- Fee posting (individual and bulk)
- Fee posting reversal
- Manual cash credit
- Online payment status changes
- Installment plan creation and selection
- Installment flag set/clear
- Debt collection rule changes
- Communication template changes
- Automated message pause/resume per student
- User account creation, deactivation, role change
- Academic term creation and active-term change
- Tax export generation
- Data anonymisation (NDPA)

If a new action is added that is not in this list, it still needs an AuditLog write. The list above is illustrative, not exhaustive.

---

## Rule 2 — The Only Path to AuditLog Is `audit.ts`

🔴 **No file calls `prisma.auditLog.create(…)` directly.**

All audit writes go through `src/lib/audit.ts`:

```typescript
// src/lib/audit.ts
export interface AuditLogEntry {
  userId: string;
  action: string;          // use constants from src/lib/constants.ts
  entity: string;          // e.g., "ManualCredit", "FeePosting"
  entityId: string;
  metadata?: Record<string, unknown>;  // changed fields, raw payloads
  isSensitive?: boolean;   // defaults to false
}

export async function writeAuditLog(
  entry: AuditLogEntry,
  tx?: Prisma.TransactionClient
): Promise<void>
```

The `tx` parameter allows the audit write to participate in a Prisma transaction. Pass it whenever the audit write must be atomic with the action it records.

---

## Rule 3 — Audit Writes Are Synchronous and Transactional Where Possible

🔴 **Do not batch or defer audit writes.**  
Write the audit log entry in the same database transaction as the action, or immediately after if a transaction is not available. If the process crashes between the action and an async audit write, the entry is lost permanently.

```typescript
// ✅ CORRECT — audit write inside the same transaction
await prisma.$transaction(async (tx) => {
  const credit = await tx.manualCredit.create({ data: creditData });
  await writeAuditLog({
    userId: ctx.session.user.id,
    action: AUDIT_ACTIONS.MANUAL_CREDIT_CREATED,
    entity: "ManualCredit",
    entityId: credit.id,
    metadata: { amount: credit.amount, studentId: credit.studentId },
    isSensitive: true,
  }, tx);
});

// 🔴 WRONG — audit write outside the transaction, after the action
const credit = await prisma.manualCredit.create({ data: creditData });
await writeAuditLog(…); // If this fails, credit exists but audit is missing
```

---

## Rule 4 — AuditLog Records Are Immutable

🔴 **No code calls `prisma.auditLog.update(…)` or `prisma.auditLog.delete(…)`.**  
The database service account is granted `INSERT` and `SELECT` on the `AuditLog` table only. `UPDATE` and `DELETE` are not granted at the database level.

If you need to record that something was reversed, write a new `AuditLog` entry with the appropriate `REVERSAL` action. Never touch the original entry.

---

## Rule 5 — Sensitive Action Flags

🔴 **Set `isSensitive: true` for these actions:**

| Action constant | Trigger |
|---|---|
| `MANUAL_CREDIT_CREATED` | Any manual cash credit |
| `PAYMENT_REFUNDED` | Any refund event from Flutterwave |
| `USER_ROLE_CHANGED` | Any change to `User.role` |
| `FEE_WAIVER_APPLIED` | Any manual credit with "Fee Waiver" description |
| `OVERPAYMENT_OVERRIDE` | Any credit that triggers the ₦5,000 overpayment warning |
| `DUPLICATE_PAYMENT_CONFIRMED` | Any cash credit confirmed after duplicate detection warning |

Sensitive entries are visible to the PROPRIETOR in the audit log viewer with a highlighted indicator.

---

## Rule 6 — Webhook Payloads in Metadata

🔴 **Every Flutterwave webhook event writes its full raw payload into `AuditLog.metadata` before any processing occurs.**

```typescript
await writeAuditLog({
  userId: SYSTEM_USER_ID,  // use a designated system user ID for automated actions
  action: AUDIT_ACTIONS.WEBHOOK_RECEIVED,
  entity: "FlutterwaveWebhook",
  entityId: payload.data.tx_ref,
  metadata: { rawPayload: payload },  // full raw body, not summarised
});
```

This must happen before the BullMQ job processes the payload. If the job crashes, the raw payload is preserved for debugging. _(PRD §6.4)_

---

## Rule 7 — Action Name Constants

🔴 **All `action` strings in AuditLog entries use constants from `src/lib/constants.ts`.**  
No free-form strings. This prevents `"MANUAL_CREDIT_CREATED"` and `"ManualCreditCreated"` and `"manual_credit_created"` all existing in the same audit log.

```typescript
// src/lib/constants.ts
export const AUDIT_ACTIONS = {
  // Auth
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  SESSION_CREATED: "SESSION_CREATED",
  SESSION_DESTROYED: "SESSION_DESTROYED",
  // Students
  STUDENT_CREATED: "STUDENT_CREATED",
  STUDENT_UPDATED: "STUDENT_UPDATED",
  STUDENT_DEACTIVATED: "STUDENT_DEACTIVATED",
  // Fees
  FEE_STRUCTURE_CREATED: "FEE_STRUCTURE_CREATED",
  FEE_POSTED_INDIVIDUAL: "FEE_POSTED_INDIVIDUAL",
  FEE_POSTED_BULK: "FEE_POSTED_BULK",
  FEE_POSTING_REVERSED: "FEE_POSTING_REVERSED",
  // Payments
  MANUAL_CREDIT_CREATED: "MANUAL_CREDIT_CREATED",
  PAYMENT_INITIATED: "PAYMENT_INITIATED",
  PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_REFUNDED: "PAYMENT_REFUNDED",
  WEBHOOK_RECEIVED: "WEBHOOK_RECEIVED",
  // Sensitive
  USER_ROLE_CHANGED: "USER_ROLE_CHANGED",
  FEE_WAIVER_APPLIED: "FEE_WAIVER_APPLIED",
  OVERPAYMENT_OVERRIDE: "OVERPAYMENT_OVERRIDE",
  DUPLICATE_PAYMENT_CONFIRMED: "DUPLICATE_PAYMENT_CONFIRMED",
  // Data
  PII_ANONYMISED: "PII_ANONYMISED",
  // … extend as needed, but always add to this constant object
} as const;
```