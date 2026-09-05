// src/server/jobs/retry-failed-installment.ts
// Retry failed installment auto-charges with 3-strike bursar flagging
// Locked per Rule PAY-7 and PRD Module F3

import { Job, Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/server/db/prisma";
import { paymentGateway } from "@/server/services/payment-gateway";
import { decrypt } from "@/server/services/encryption";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { sendPaymentConfirmation } from "@/server/services/notifications/send-payment-confirmation";
import { createBursarNotificationAlert } from "@/server/services/notifications/bursar-alerts";

export interface RetryInstallmentJobData {
  installmentId: string;
  attemptCount: number;
}

export async function processRetryFailedInstallment(job: Job<RetryInstallmentJobData>) {
  const { installmentId, attemptCount } = job.data;

  const installment = await prisma.installment.findUnique({
    where: { id: installmentId },
    include: {
      student: {
        include: {
          parentLinks: {
            where: { isActive: true },
            include: { parent: true },
          },
        },
      },
    },
  });

  if (!installment || installment.paidAt !== null) {
    return;
  }

  const student = installment.student;
  const parent = student.parentLinks[0]?.parent;

  if (!installment.cardToken) {
    return;
  }

  try {
    const rawToken = decrypt(installment.cardToken);
    const txRef = `INST-RETRY-${student.id.substring(0, 5)}-${installment.id.substring(0, 5)}-${Date.now()}`;

    const chargeResult = await paymentGateway.chargeToken({
      token: rawToken,
      amount: installment.amountDue,
      txRef,
      email: parent?.email || "parent@schoolfin.ng",
      fullName: `${student.firstName} ${student.lastName}`,
    });

    if (chargeResult.status === "success") {
      await prisma.$transaction(async (tx) => {
        const createdPayment = await tx.payment.create({
          data: {
            studentId: student.id,
            amount: installment.amountDue,
            status: "SUCCESS",
            method: "CARD",
            flutterwaveRef: txRef,
            installmentId: installment.id,
            paidAt: new Date(),
          },
        });

        const currentYear = new Date().getFullYear();
        const count = await tx.receipt.count();
        const receiptNumber = `RCP-${currentYear}-${String(count + 1).padStart(6, "0")}`;

        const receipt = await tx.receipt.create({
          data: {
            receiptNumber,
            studentId: student.id,
            amount: installment.amountDue,
            method: "CARD",
            paymentId: createdPayment.id,
          },
        });

        await tx.installment.update({
          where: { id: installment.id },
          data: {
            paidAt: new Date(),
            isFlagged: false,
          },
        });

        await writeAuditLog(
          {
            userId: "system",
            action: AUDIT_ACTIONS.PAYMENT_SUCCESS,
            entity: "Installment",
            entityId: installment.id,
            metadata: {
              receiptNumber,
              amount: installment.amountDue.toString(),
              retryAttempt: attemptCount,
            },
          },
          tx,
        );

        await sendPaymentConfirmation({
          studentId: student.id,
          studentFirstName: student.firstName,
          parentEmail: parent?.email,
          parentPhone: parent?.phone,
          amount: installment.amountDue.toString(),
          receiptNumber,
        });
      });
    } else {
      const nextAttempt = attemptCount + 1;

      await prisma.installment.update({
        where: { id: installment.id },
        data: {
          failedAttempts: nextAttempt,
          isFlagged: nextAttempt >= 3,
        },
      });

      if (nextAttempt >= 3) {
        // 3 consecutive failures: Alert bursar (Rule PAY-7 / PRD §F3)
        await createBursarNotificationAlert({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          notificationType: `Installment #${installment.partNumber} Auto-Charge (3 consecutive failures)`,
        });

        await writeAuditLog({
          userId: "system",
          action: AUDIT_ACTIONS.INSTALLMENT_FLAGGED,
          entity: "Installment",
          entityId: installment.id,
          metadata: { reason: "3 consecutive auto-charge failures", studentId: student.id },
        });
      }
    }
  } catch (error) {
    console.error(`Retry attempt failed for installment ${installment.id}:`, error);
  }
}
