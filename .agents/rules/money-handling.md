---
trigger: glob
globs:
  - "src/server/services/**"
  - "src/server/trpc/**"
  - "prisma/schema.prisma"
  - "src/components/**"
---

# money-handling.md

> 🔴 Every rule in this file is a hard requirement.  
> A financial feature that produces correct output using the wrong data type is still a failed task.

---

## Rule 1 — The Type Rule

🔴 **Every monetary amount is stored as `Decimal @db.Decimal(12,2)` in Prisma.**  
This applies to every field that holds an NGN amount anywhere in the schema. No exceptions.

```prisma
// ✅ CORRECT
amount  Decimal @db.Decimal(12, 2)

// 🔴 FORBIDDEN — will cause floating-point errors
amount  Float
// 🔴 FORBIDDEN — loses decimal places
amount  Int
// 🔴 FORBIDDEN — requires manual parsing everywhere
amount  String
```

🔴 **Never convert a monetary Decimal to a JavaScript `number` for arithmetic.**  
Prisma returns `Decimal` objects. Use Decimal arithmetic methods on them. Only convert to `number` at the final serialisation boundary (e.g., formatting for display in the UI).

**Approved pattern for Decimal arithmetic:**
```typescript
import { Decimal } from "@prisma/client/runtime/library";

// Addition
const total = chargesSum.add(new Decimal("0"));

// Subtraction
const outstanding = chargesSum.sub(reversalsSum).sub(paymentsSum).sub(creditsSum).sub(creditBalance);

// Comparison
if (outstanding.greaterThan(new Decimal("0"))) { … }

// Display formatting (only at UI boundary)
const displayAmount = outstanding.toNumber().toLocaleString("en-NG", {
  style: "currency",
  currency: "NGN",
});
```

---

## Rule 2 — The Balance Formula Rule

🔴 **The outstanding balance for any student is computed using exactly this formula, in this function, and nowhere else:**

```
Outstanding Balance =
    SUM(FeePosting.amount WHERE type = CHARGE AND studentId = X AND termId = Y)
  − SUM(FeePosting.amount WHERE type = REVERSAL AND studentId = X AND termId = Y)
  − SUM(Payment.amount WHERE status = SUCCESS AND studentId = X)
  − SUM(ManualCredit.amount WHERE studentId = X)
  − Student.creditBalance
```

The single implementation lives in `src/server/services/balance/index.ts`.  
Its exported function signature is:
```typescript
export async function computeOutstandingBalance(
  studentId: string,
  termId: string
): Promise<Decimal>
```

🔴 **No other code computes a balance.**  
No tRPC procedure, no report function, no BullMQ job, no React component computes a balance inline. All call `computeOutstandingBalance`.

🔴 **No balance is cached on the `Student` model** (except `Student.creditBalance`, which holds forward-carried overpayments only — not the outstanding balance).

**For the debtor list (Module H):** The balance for all students is pre-aggregated server-side in a single query before pagination. The `computeOutstandingBalance` function must support a bulk variant that avoids N+1 queries. _(PRD §B1)_

---

## Rule 3 — The Overpayment Rule

🔴 **Overpayments are stored in `Student.creditBalance`, never refunded.**  
SchoolFin does not process cash refunds. If a parent overpays, the surplus goes into `Student.creditBalance`. No refund button, no refund flow, no refund tRPC procedure exists.

🔴 **On saving a manual credit that exceeds the outstanding balance by more than ₦5,000:**
1. Show this exact warning: _"This payment exceeds the outstanding balance by [amount]. Please confirm this is correct and enter a reason."_
2. A reason field (required) appears.
3. Save only after the bursar provides a reason.
4. Flag the transaction `isSensitive: true` in AuditLog.
5. Send a notification to the proprietor's email.

The ₦5,000 threshold is hardcoded as `OVERPAYMENT_WARNING_THRESHOLD_KOBO = 500000` (stored in kobo for safe integer comparison).

🔴 **`Student.creditBalance` is applied automatically against the student's next fee posting.**  
When a new `FeePosting` is created for a student with a non-zero `creditBalance`, the credit is deducted from the posted amount and `creditBalance` is reset to zero in the same database transaction.

---

## Rule 4 — The Duplicate Cash Payment Rule

🔴 **Before saving any `ManualCredit`, check for a duplicate.**  
A duplicate is defined as: same `studentId`, same `amount`, same `recordedById`, same calendar day.

If a match is found:
1. Show a warning containing the existing payment's timestamp and receipt number.
2. Require the bursar to type a reason before saving.
3. Flag the confirmed transaction `isSensitive: true` in AuditLog.

_(PRD §D1-AC10)_

---

## Rule 5 — The Online Payment Cap Rule

🔴 **A parent cannot initiate an online payment for more than the current outstanding balance.**  
Enforce this on the server in the `payments.initiateOnline` tRPC procedure. The Flutterwave popup amount is pre-filled to the outstanding balance. The server must reject any amount greater than the outstanding balance before passing to Flutterwave.

_(PRD §E1-AC2)_

---

## Rule 6 — The Receipt Number Rule

🔴 **Receipt numbers follow the format `RCP-YYYY-NNNNNN` exactly.**  
- `YYYY` is the calendar year of issuance.  
- `NNNNNN` is a zero-padded, globally sequential auto-increment across all students and payment types.  
- Never generate receipt numbers per-student.  
- Never use a UUID, CUID, or random string as a receipt number.

The sequence is maintained in the database. Use a Postgres sequence or a locked-row increment to prevent gaps under concurrent writes.

_(PRD §Assumption 21, §D1-AC5)_

---

## Rule 7 — The Fee Posting Duplicate Rule

🔴 **If a student already has a `FeePosting` for the same `feeStructureId` and `termId`, block the action entirely.**  
Return this exact error message:  
_"This fee structure has already been posted to [Student Name] for this term. Create a new fee structure if you need to post a supplementary charge."_

No confirmation bypass. No admin override at the application layer. No second attempt. _(PRD §C2-AC6)_

---

## Rule 8 — The Reversal Window Rule

🔴 **Fee posting reversals are allowed only within 24 hours of the original posting, and only by the PROPRIETOR role.**  
After 24 hours, the reverse action is disabled in the UI and replaced with:  
_"Contact your system administrator to reverse postings older than 24 hours."_

A reversal creates a new `FeePosting` with `type = REVERSAL`. The original is never modified. _(PRD §C2-AC8)_