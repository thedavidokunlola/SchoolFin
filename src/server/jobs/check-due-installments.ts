// src/server/jobs/check-due-installments.ts
// Cron job checking due installments (07:00 WAT daily)
// Locked per PRD §6.5, Rule PAY-6, PAY-7

import { Job, Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/server/db/prisma";
import { paymentGateway } from "@/server/services/payment-gateway";
import { decrypt } from "@/server/services/encryption";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { Decimal } from "@prisma/client/runtime/library";
import { installmentsQueue } from "./queues";
import { sendPaymentConfirmation } from "@/server/services/notifications/send-payment-confirmation";

export async function handleCheckDueInstallments() {
  const today = new Date();

  // Find due unpaid installments
  const dueInstallments = await prisma.installment.findMany({
    where: {
      paidAt: null,
      dueDate: { lte: today },
      isPaused: false,
    },
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

  for (const installment of dueInstallments) {
    const student = installment.student;
    const parent = student.parentLinks[0]?.parent;

    // Rule PAY-6: If cardToken is null, parent pays manually via portal
    if (!installment.cardToken) {
      continue;
    }

    try {
      const rawToken = decrypt(installment.cardToken);
      const txRef = `INST-${student.id.substring(0, 5)}-${installment.id.substring(0, 5)}-${Date.now()}`;

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
                partNumber: installment.partNumber,
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
        // Failed auto-charge: Increment failedAttempts and schedule retry in 48 hours (Rule PAY-7)
        const nextAttempts = installment.failedAttempts + 1;

        await prisma.installment.update({
          where: { id: installment.id },
          data: {
            failedAttempts: nextAttempts,
            isFlagged: nextAttempts >= 3,
          },
        });

        await writeAuditLog({
          userId: "system",
          action: AUDIT_ACTIONS.INSTALLMENT_CHARGE_FAILED,
          entity: "Installment",
          entityId: installment.id,
          metadata: { reason: chargeResult.message, attempt: nextAttempts },
        });

        // Enqueue retry in 48 hours
        await installmentsQueue.add(
          "retry-failed-installment",
          {
            installmentId: installment.id,
            attemptCount: nextAttempts,
          },
          {
            delay: 48 * 60 * 60 * 1000, // 48 hours
          },
        );
      }
    } catch (error) {
      console.error(`Error processing due installment ${installment.id}:`, error);
    }
  }
}
