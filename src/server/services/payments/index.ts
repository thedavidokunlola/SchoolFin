// src/server/services/payments/index.ts
// Online payment initiation service
// Locked per Rule MONEY-8, Module E1, and payment gateway boundary

import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { computeOutstandingBalance } from "@/server/services/balance";
import { paymentGateway } from "@/server/services/payment-gateway";
import { schoolConfig } from "@/../../school.config";
import { config } from "@/lib/config";
import { writeAuditLog } from "@/lib/audit";
import { encrypt } from "@/server/services/encryption";

export interface InitiateOnlinePaymentInput {
  studentId: string;
  amount: string | number;
  termId: string;
  payerEmail: string;
  payerName: string;
  payerPhone?: string;
  installmentId?: string;
}

export async function initiateOnlinePayment(input: InitiateOnlinePaymentInput) {
  const [student, balance] = await Promise.all([
    prisma.student.findUnique({ where: { id: input.studentId } }),
    computeOutstandingBalance(input.studentId, input.termId),
  ]);

  if (!student || !student.isActive) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
  }

  const requestedAmount = new Decimal(input.amount);

  if (requestedAmount.lte(0)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Payment amount must be greater than zero" });
  }

  // Rule MONEY-8: Parent cannot pay more than the outstanding balance online (server-side enforcement)
  if (requestedAmount.gt(balance)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Payment amount (₦${requestedAmount.toFixed(2)}) cannot exceed outstanding balance (₦${balance.toFixed(2)})`,
    });
  }

  // Generate unique transaction reference
  const txRef = `PAY-${student.admissionNumber.replace(/\//g, "-")}-${Date.now()}`;

  // Record pending payment in database
  const payment = await prisma.payment.create({
    data: {
      studentId: input.studentId,
      amount: requestedAmount,
      status: "PENDING",
      method: "CARD",
      flutterwaveRef: txRef,
      installmentId: input.installmentId || null,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || `https://${schoolConfig.domain}`;

  // Call payment gateway to get payment link
  const result = await paymentGateway.initiatePayment({
    txRef,
    amount: requestedAmount,
    redirectUrl: `${baseUrl}/parent/students/${input.studentId}?status=complete`,
    customer: {
      email: input.payerEmail,
      name: input.payerName,
      phone: input.payerPhone,
    },
    customizations: {
      title: `${schoolConfig.name} - School Fees`,
      description: `Fees payment for ${student.firstName} ${student.lastName} (${student.admissionNumber})`,
      logo: schoolConfig.logoUrl,
    },
    meta: {
      studentId: input.studentId,
      paymentId: payment.id,
      installmentId: input.installmentId,
    },
  });

  if (result.status !== "success" || !result.paymentLink) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: result.message || "Failed to initialize payment gateway",
    });
  }

  return {
    paymentId: payment.id,
    txRef,
    paymentLink: result.paymentLink,
    publicKey: config.flutterwave.publicKey,
    amount: requestedAmount.toString(),
  };
}

export async function verifyPaymentStatus(txRef: string, transactionId?: string | number) {
  let payment = await prisma.payment.findUnique({
    where: { flutterwaveRef: txRef },
    include: {
      receipt: true,
      student: true,
    },
  });

  if (!payment) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Payment record not found" });
  }

  // If already marked SUCCESS, return immediately
  if (payment.status === "SUCCESS") {
    return payment;
  }

  // Verify against Flutterwave API if still PENDING
  try {
    const verification = await paymentGateway.verifyTransaction(transactionId || txRef);

    if (verification.status === "success") {
      const paidAmount = new Decimal(verification.amount);

      await prisma.$transaction(async (tx) => {
        // 1. Update Payment status
        await tx.payment.update({
          where: { id: payment!.id },
          data: {
            status: "SUCCESS",
            amount: paidAmount,
            paidAt: new Date(),
          },
        });

        // 2. Generate sequential receipt number (Rule MONEY-10: RCP-YYYY-NNNNNN)
        const currentYear = new Date().getFullYear();
        const count = await tx.receipt.count();
        const receiptNumber = `RCP-${currentYear}-${String(count + 1).padStart(6, "0")}`;

        await tx.receipt.create({
          data: {
            receiptNumber,
            studentId: payment!.studentId,
            amount: paidAmount,
            method: "CARD",
            paymentId: payment!.id,
          },
        });

        // 3. If installment, mark as paid
        if (payment!.installmentId) {
          const installmentData: { paidAt: Date; cardToken?: string } = {
            paidAt: new Date(),
          };
          if (verification.cardToken) {
            installmentData.cardToken = encrypt(verification.cardToken);
          }
          await tx.installment.update({
            where: { id: payment!.installmentId },
            data: installmentData,
          });
        }
      });

      // Write audit log (Rule AUDIT-1)
      await writeAuditLog({
        userId: "system",
        action: "PAYMENT_SUCCESS",
        entity: "Payment",
        entityId: payment.id,
        metadata: {
          txRef,
          amount: verification.amount,
          studentId: payment.studentId,
          status: "SUCCESS",
        },
      });

      // Refetch updated payment with receipt
      payment = await prisma.payment.findUnique({
        where: { id: payment.id },
        include: {
          receipt: true,
          student: true,
        },
      });
    } else if (verification.status === "failed") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
  }

  return payment;
}
