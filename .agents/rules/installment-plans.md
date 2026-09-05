---
trigger: glob
globs:
  - "src/server/services/installments/**"
  - "src/server/trpc/router/installments*.ts"
  - "src/app/**/installments/**"
---

# installment-plans.md

> 🔴 All rules here are hard requirements from PRD §F1, §F2, §F3, and §Assumption 8.

---

## Rule 1 — Parents Select, Never Create

🔴 **Parents can only select from installment plan presets created by the bursar or proprietor.**  
There is no UI or tRPC procedure that allows a parent to create, modify, or delete an installment plan.  
The `installments.createPlan` procedure is restricted to BURSAR and PROPRIETOR roles.

_(PRD §F1, §Assumption 8)_

---

## Rule 2 — First Installment Is Charged Immediately

🔴 **When a parent selects an installment plan, the first installment payment is collected immediately via Flutterwave.**  
The system does not create the plan and wait for the parent to initiate the first payment manually.

After the first payment succeeds:
1. Create `Installment` records for all parts.
2. Tokenise the card (if payment was made by card — see Rule 4).
3. Record the plan selection.

_(PRD §F2-AC4, §13-Q8)_

---

## Rule 3 — Plan Amounts Are Computed From Outstanding Balance

🔴 **When a parent selects a plan, show the exact NGN amounts and due dates for each installment based on the student's current outstanding balance.**  
Do not use a fixed template amount. Compute installment amounts from `computeOutstandingBalance(studentId, termId)` at the time of plan selection.

---

## Rule 4 — Card Tokenisation

🔴 **At the time of the first installment payment, request Flutterwave to tokenise the card.**  
Store the returned token encrypted (AES-256) in `Installment.cardToken`.

🔴 **If no token is returned** (parent paid via bank transfer or USSD):
- `Installment.cardToken = null`.
- Subsequent installments require manual payment by the parent.
- Show a "Pay Now" button on each upcoming installment in the parent portal.
- Send reminder notifications on the normal schedule.
- Never attempt an auto-charge when `cardToken` is null.

_(PRD §F2-AC4)_

---

## Rule 5 — Pre-Retry Notification (24 Hours Before Retry)

🔴 **Before retrying a failed installment charge, send the parent a notification 24 hours in advance.**  
The message must say exactly:  
_"Your installment payment of [amount] failed. We will retry this charge on [date]. Please ensure sufficient funds are available, or log in to pay manually."_  
Send via both Email and SMS.

🔴 **The retry happens 48 hours after the failure notification is sent** (i.e., 48 hours after the initial failure is detected).  
Timeline: failure detected → notify parent immediately → wait 24 hours → send pre-retry notice → wait 24 more hours → retry charge.

_(PRD §F3-AC2, §F3-AC3)_

---

## Rule 6 — Installment Due Reminders

🔴 **Send a reminder notification to the parent 48 hours before any installment due date.**  
This is separate from the failed-payment pre-retry notice. This is a standard upcoming-payment reminder.

_(PRD §F3-AC1)_

---

## Rule 7 — Failure Escalation

🔴 **After 3 consecutive failed charge attempts on the same installment:**
1. Set `Installment.isFlagged = true`.
2. Send a notification to the bursar.
3. The installment appears highlighted on the student profile and in the debtor list.

🔴 **The retry count applies to the same installment part, not to the overall plan.**  
Three failures on Part 2 flags Part 2. It does not affect Part 3.

_(PRD §F3-AC4)_

---

## Rule 8 — Deactivated Plans Are Hidden From Parents

🔴 **A deactivated installment plan (`InstallmentPlan.isActive = false`) does not appear in the parent's plan selection screen.**  
The query for available plans filters `isActive = true` only.

---

## Rule 9 — Plan Count Limits

🔴 **An installment plan must have between 2 and 6 parts.**  
The `InstallmentPlan.numberOfParts` field must be validated at input: `z.number().int().min(2).max(6)`. _(PRD §F1-AC1)_