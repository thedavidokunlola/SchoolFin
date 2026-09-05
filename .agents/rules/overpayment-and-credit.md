---
trigger: glob
globs:
  - "src/server/services/**"
  - "src/server/trpc/router/payments*.ts"
  - "src/app/**"
---

# overpayment-and-credit.md

> 🔴 All rules here are hard requirements from PRD §D1, §B1, and §Assumption 28.

---

## Rule 1 — No Cash Refunds Through SchoolFin

🔴 **SchoolFin does not process, initiate, or record cash refunds.**  
If a parent has overpaid, the surplus is stored in `Student.creditBalance`. There is no refund button, no refund tRPC procedure, and no refund flow.

If a parent requests a cash refund, that is handled entirely outside SchoolFin. _(PRD §D1-AC3, §Assumption 28)_

---

## Rule 2 — Overpayment Warning Threshold

🔴 **If a manual cash credit exceeds the current outstanding balance by more than ₦5,000, the system must:**
1. Show this exact warning: _"This payment exceeds the outstanding balance by [amount]. Please confirm this is correct and enter a reason."_
2. Display a required reason text field.
3. Block saving until the bursar enters a reason.
4. On save with a reason: record the credit, flag `isSensitive: true` in AuditLog with action `OVERPAYMENT_OVERRIDE`, and send an email notification to the proprietor.

The threshold constant:
```typescript
// src/lib/constants.ts
export const OVERPAYMENT_WARNING_THRESHOLD_NGN = new Decimal("5000");
```

_(PRD §D1-AC2)_

---

## Rule 3 — Surplus Goes to `Student.creditBalance`

🔴 **Any amount paid beyond the outstanding balance is stored in `Student.creditBalance`.**  
`creditBalance` is a `Decimal @db.Decimal(12,2)` field. It is always non-negative.

```typescript
// Example: outstanding is ₦10,000, parent pays ₦12,000
// surplus = 12,000 − 10,000 = 2,000
await prisma.student.update({
  where: { id: studentId },
  data: { creditBalance: { increment: new Decimal("2000") } },
});
```

_(PRD §D1-AC3)_

---

## Rule 4 — Credit Balance Applied Automatically on Next Fee Posting

🔴 **When a new `FeePosting` (type = CHARGE) is created for a student with `creditBalance > 0`, the credit is deducted from the posted amount and `creditBalance` is reset to zero.**

🔴 **This must happen in a single database transaction** — the fee posting creation and the credit balance reset are atomic.

```typescript
await prisma.$transaction(async (tx) => {
  const student = await tx.student.findUnique({ where: { id: studentId }, select: { creditBalance: true } });
  const posting = await tx.feePosting.create({ data: { …, amount: feeAmount } });
  if (student.creditBalance.greaterThan(0)) {
    await tx.student.update({
      where: { id: studentId },
      data: { creditBalance: new Decimal("0") },
    });
    // The credit balance is reflected in the balance formula automatically
    // (it is subtracted in computeOutstandingBalance)
    await writeAuditLog({
      action: AUDIT_ACTIONS.CREDIT_BALANCE_APPLIED,
      entity: "Student",
      entityId: studentId,
      metadata: { appliedAmount: student.creditBalance, newFeePostingId: posting.id },
    }, tx);
  }
});
```

_(PRD §Assumption 28)_

---

## Rule 5 — Duplicate Cash Payment Detection

🔴 **Before saving any `ManualCredit`, run a duplicate check.**

A duplicate is: same `studentId` + same `amount` + same `recordedById` + same calendar day (based on `recordedAt` date, not time).

If a match is found:
1. Show a warning with the existing payment's timestamp and receipt number.
2. Require the bursar to type a reason before saving.
3. Save only after reason is entered.
4. Flag the new transaction `isSensitive: true` in AuditLog with action `DUPLICATE_PAYMENT_CONFIRMED`.

_(PRD §D1-AC10)_

---

## Rule 6 — `creditBalance` Is Always Non-Negative

🔴 **`Student.creditBalance` must never be negative.**  
Application logic must never subtract from `creditBalance` in a way that results in a negative value. If the credit balance to be applied exceeds the fee amount, apply only the fee amount and zero out `creditBalance`.

---

## Rule 7 — Balance Formula Includes `creditBalance`

🔴 **The outstanding balance formula always subtracts `Student.creditBalance`.**  
This is already defined in `money-handling.md` and `src/server/services/balance/`. No code should compute a balance without accounting for `creditBalance`.