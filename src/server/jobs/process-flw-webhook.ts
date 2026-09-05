// src/server/jobs/process-flw-webhook.ts
// Asynchronous Flutterwave Webhook Processor
// Locked per Rule PAY-1, PAY-2, PAY-3, AUDIT-4, bullmq-job-handler skill

import { Job, Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/server/db/prisma";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { Decimal } from "@prisma/client/runtime/library";
import { paymentGateway } from "@/server/services/payment-gateway";
import { sendPaymentConfirmation } from "@/server/services/notifications/send-payment-confirmation";
import { encrypt } from "@/server/services/encryption";

export interface FlwWebhookJobData {
  payload: Record<string, any>;
}

export async function handleProcessFlwWebhook(job: Job<FlwWebhookJobData>) {
  const data = job.data.payload.data || job.data.payload;
  const txRef = data.tx_ref || data.txRef;

  if (!txRef) {
    return;
  }

  // Step 3: IDEMPOTENCY FIRST — discard if already SUCCESS (Rule PAY-3)
  const existingPayment = await prisma.payment.findUnique({
    where: { flutterwaveRef: txRef },
    include: { student: true },
  });

  if (existingPayment?.status === "SUCCESS") {
    await writeAuditLog({
      userId: "system",
      action: "WEBHOOK_DUPLICATE_DISCARDED",
      entity: "Payment",
      entityId: txRef,
      metadata: { txRef, status: "SUCCESS" },
    });
    return;
  }

  // Verify transaction with Flutterwave API
  const verification = await paymentGateway.verifyTransaction(data.id || txRef);

  if (verification.status === "success") {
    const paidAmount = new Decimal(verification.amount);

    await prisma.$transaction(async (tx) => {
      const studentId = existingPayment?.studentId || (data.meta?.studentId as string);

      if (!studentId) {
        throw new Error(`Missing studentId for transaction ${txRef}`);
      }

      // 1. Update or create Payment
      let paymentId: string;
      if (existingPayment) {
        const updated = await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: "SUCCESS",
            amount: paidAmount,
            paidAt: new Date(),
          },
        });
        paymentId = updated.id;
      } else {
        const created = await tx.payment.create({
          data: {
            studentId,
            amount: paidAmount,
            status: "SUCCESS",
            method: "CARD",
            flutterwaveRef: txRef,
            paidAt: new Date(),
          },
        });
        paymentId = created.id;
      }

      // 2. Generate sequential receipt number and link payment (Rule MONEY-10)
      const currentYear = new Date().getFullYear();
      const count = await tx.receipt.count();
      const receiptNumber = `RCP-${currentYear}-${String(count + 1).padStart(6, "0")}`;

      const receipt = await tx.receipt.create({
        data: {
          receiptNumber,
          studentId,
          amount: paidAmount,
          method: "CARD",
          paymentId,
        },
      });

      // 3. If this is an installment payment, mark installment and tokenise card (Rule PAY-5, PAY-6)
      if (existingPayment?.installmentId) {
        const updateData: { paidAt: Date; cardToken?: string } = {
          paidAt: new Date(),
        };

        if (verification.cardToken) {
          updateData.cardToken = encrypt(verification.cardToken);
        }

        await tx.installment.update({
          where: { id: existingPayment.installmentId },
          data: updateData,
        });
      }

      // 4. Audit Log on success
      await writeAuditLog(
        {
          userId: "system",
          action: AUDIT_ACTIONS.PAYMENT_SUCCESS,
          entity: "Payment",
          entityId: txRef,
          metadata: {
            receiptNumber,
            amount: paidAmount.toString(),
            method: verification.paymentType,
          },
        },
        tx,
      );

      // 5. Enqueue notifications
      const student = await tx.student.findUnique({
        where: { id: studentId },
        include: {
          parentLinks: {
            where: { isActive: true },
            include: { parent: true },
          },
        },
      });

      const parent = student?.parentLinks[0]?.parent;

      if (student) {
        await sendPaymentConfirmation({
          studentId: student.id,
          studentFirstName: student.firstName,
          parentEmail: parent?.email || verification.customerEmail,
          parentPhone: parent?.phone,
          amount: paidAmount.toString(),
          receiptNumber,
        });
      }
    });
  } else if (verification.status === "failed") {
    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: { status: "FAILED" },
      });
    }

    await writeAuditLog({
      userId: "system",
      action: AUDIT_ACTIONS.PAYMENT_FAILED,
      entity: "Payment",
      entityId: txRef,
      metadata: { flutterwaveRef: txRef, reason: "Verification returned failed" },
    });
  }
}

export const flwWebhookWorker = new Worker(
  "payments",
  async (job: Job) => {
    if (job.name === "process-flw-webhook") {
      await handleProcessFlwWebhook(job as Job<FlwWebhookJobData>);
    }
  },
  {
    connection: redis,
    concurrency: 5,
  },
);

flwWebhookWorker.on("failed", async (job: Job | undefined, error: Error) => {
  const isFinalFailure = job && job.attemptsMade >= (job.opts.attempts ?? 1);
  if (isFinalFailure) {
    await writeAuditLog({
      userId: "system",
      action: "JOB_FINAL_FAILURE",
      entity: "BullMQJob",
      entityId: job?.id ?? "unknown",
      metadata: { jobName: job?.name, error: error.message },
    });
  }
});
