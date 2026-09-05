// src/server/jobs/poll-pending-payments.ts
// Fallback poller for pending payments older than 10 minutes
// Locked per Rule PAY-4, PRD §6.5, and bullmq-job-handler skill

import { Job, Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/server/db/prisma";
import { paymentGateway } from "@/server/services/payment-gateway";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { Decimal } from "@prisma/client/runtime/library";
import { sendPaymentConfirmation } from "@/server/services/notifications/send-payment-confirmation";

export async function handlePollPendingPayments() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const pendingPayments = await prisma.payment.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: tenMinutesAgo },
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
    take: 50,
  });

  for (const payment of pendingPayments) {
    if (!payment.flutterwaveRef) {
      continue;
    }

    const flutterwaveRef = payment.flutterwaveRef;

    try {
      const verification = await paymentGateway.verifyTransaction(flutterwaveRef);

      if (verification.status === "success") {
        const paidAmount = new Decimal(verification.amount);

        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "SUCCESS",
              amount: paidAmount,
              paidAt: new Date(),
            },
          });

          const currentYear = new Date().getFullYear();
          const count = await tx.receipt.count();
          const receiptNumber = `RCP-${currentYear}-${String(count + 1).padStart(6, "0")}`;

          const receipt = await tx.receipt.create({
            data: {
              receiptNumber,
              studentId: payment.studentId,
              amount: paidAmount,
              method: "CARD",
              paymentId: payment.id,
            },
          });

          await writeAuditLog(
            {
              userId: "system",
              action: AUDIT_ACTIONS.PAYMENT_SUCCESS,
              entity: "Payment",
              entityId: flutterwaveRef,
              metadata: {
                receiptNumber,
                amount: paidAmount.toString(),
                recoveredBy: "poll-pending-payments",
              },
            },
            tx,
          );

          const parent = payment.student.parentLinks[0]?.parent;
          await sendPaymentConfirmation({
            studentId: payment.student.id,
            studentFirstName: payment.student.firstName,
            parentEmail: parent?.email || verification.customerEmail,
            parentPhone: parent?.phone,
            amount: paidAmount.toString(),
            receiptNumber,
          });
        });
      } else if (verification.status === "failed") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });

        await writeAuditLog({
          userId: "system",
          action: AUDIT_ACTIONS.PAYMENT_FAILED,
          entity: "Payment",
          entityId: flutterwaveRef,
          metadata: { flutterwaveRef, recoveredBy: "poll-pending-payments" },
        });
      }
    } catch (error) {
      console.error(`Error polling payment ${flutterwaveRef}:`, error);
    }
  }
}
