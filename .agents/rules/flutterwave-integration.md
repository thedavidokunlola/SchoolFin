---
trigger: glob
globs:
  - "src/server/services/payment-gateway/**"
  - "src/app/api/webhooks/flutterwave/**"
  - "worker/**"
---

# flutterwave-integration.md

> 🔴 All rules here are hard requirements from PRD §6.4, §E1, §F2, §F3, and §8.

---

## Rule 1 — Verify Webhook Signature Before Anything Else

🔴 **The first action in the Flutterwave webhook handler is signature verification.**  
Compare the `verif-hash` header against `config.flutterwave.secretHash`.  
Return HTTP 401 immediately for any mismatch. Do not log the payload. Do not queue a job. Do not read the body further.

```typescript
// POST /api/webhooks/flutterwave
export async function POST(req: Request) {
  const signature = req.headers.get("verif-hash");
  if (signature !== config.flutterwave.secretHash) {
    return new Response("Unauthorized", { status: 401 });
  }
  const payload = await req.json();
  // Write raw payload to AuditLog BEFORE queuing
  await writeAuditLog({ … rawPayload: payload … });
  // Queue for async processing
  await webhookQueue.add("process-flw-webhook", { payload });
  return new Response("OK", { status: 200 });
}
```

---

## Rule 2 — Return 200 Immediately; Process Asynchronously

🔴 **The webhook endpoint returns HTTP 200 to Flutterwave before any processing occurs.**  
The verified payload is written to a BullMQ queue. The endpoint does not wait for the queue job to complete.

If the endpoint takes too long to respond, Flutterwave will retry the webhook, causing duplicate deliveries. Returning 200 quickly prevents this.

---

## Rule 3 — Idempotency on flutterwaveRef

🔴 **Before processing any webhook, check if the `flutterwaveRef` already has `status = SUCCESS` in the `Payment` table.**  
If it does, discard the webhook without reprocessing. Log the discard in AuditLog with action `WEBHOOK_DUPLICATE_DISCARDED`.

```typescript
// Inside the process-flw-webhook BullMQ job
const existing = await prisma.payment.findUnique({
  where: { flutterwaveRef: payload.data.tx_ref },
  select: { status: true },
});
if (existing?.status === "SUCCESS") {
  await writeAuditLog({ action: AUDIT_ACTIONS.WEBHOOK_DUPLICATE_DISCARDED, … });
  return; // Do not reprocess
}
```

🔴 **Never double-credit a student account.**

---

## Rule 4 — The PaymentGateway Abstraction

🔴 **Nothing outside `src/server/services/payment-gateway/` imports from the Flutterwave SDK or calls a Flutterwave URL directly.**

All Flutterwave operations go through the `PaymentGateway` interface:

```typescript
// src/server/services/payment-gateway/interface.ts
export interface PaymentGateway {
  initiatePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult>;
  verifyTransaction(ref: string): Promise<TransactionVerificationResult>;
  tokeniseCard(transactionRef: string): Promise<string | null>;
  chargeToken(encryptedToken: string, params: ChargeTokenParams): Promise<ChargeResult>;
}
```

The `FlutterwaveAdapter` in the same folder is the only class that imports the Flutterwave SDK.

🔴 **ESLint must be configured to prevent imports of the Flutterwave SDK outside `payment-gateway/`.** (See `folder-structure.md`.)

---

## Rule 5 — The poll-pending-payments Fallback Job

🔴 **The `poll-pending-payments` BullMQ job runs every 15 minutes.**  
It queries all `Payment` records with `status = PENDING` and `createdAt` older than 10 minutes.  
For each:
1. Call `PaymentGateway.verifyTransaction(payment.flutterwaveRef)`.
2. If Flutterwave confirms `SUCCESS`: update `Payment.status = SUCCESS`, credit the student account, create a `Receipt` record, queue the parent confirmation notification.
3. If Flutterwave confirms `FAILED`: update `Payment.status = FAILED`, queue the failure notification.
4. Log the reconciliation action in AuditLog.

_(PRD §6.5, §8)_

---

## Rule 6 — Supported Webhook Events

🔴 **Only these event types are processed:**
- `charge.completed` → update payment to `SUCCESS`
- `charge.failed` → update payment to `FAILED`
- `refund.completed` → record refund, flag `isSensitive: true` in AuditLog, notify proprietor

Any other event type is logged to AuditLog and discarded without processing.

---

## Rule 7 — Card Tokenisation

🔴 **Card tokenisation is requested at the time of the first installment payment only.**  
The returned token is immediately encrypted with AES-256 and stored in `Installment.cardToken`. See `encryption.md`.

🔴 **If Flutterwave does not return a token** (parent paid via bank transfer or USSD):
- Set `Installment.cardToken = null`.
- Do not attempt future auto-charges for this installment plan.
- Show a "Pay Now" button on each upcoming installment in the parent portal.
- Send reminder notifications as normal.

_(PRD §F2-AC4)_

---

## Rule 8 — Raw Payload Preserved

🔴 **The raw Flutterwave webhook payload is written to `AuditLog.metadata` before the BullMQ job processes it.**  
If the job fails or crashes, the raw payload is available for manual reprocessing or debugging. _(PRD §6.4)_

---

## Rule 9 — Never Hold or Move Funds

🔴 **SchoolFin never holds, transfers, or moves funds.**  
Parents pay directly to the school's Flutterwave merchant account. The builder does not handle any funds. SchoolFin records transactions; it does not participate in them. _(PRD §Assumption 22)_