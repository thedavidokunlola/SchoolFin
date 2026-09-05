// src/server/services/cash/index.ts
// Manual cash payment crediting and receipt generation
// Locked per money-handling.md, overpayment-and-credit.md, and PRD Module D1

import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  AUDIT_ACTIONS,
  OVERPAYMENT_WARNING_THRESHOLD_NGN,
} from "@/lib/constants";
import { computeOutstandingBalance } from "@/server/services/balance";
import { Decimal } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";

export async function generateSequentialReceiptNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `RCP-${currentYear}-`;

  const count = await tx.receipt.count({
    where: {
      receiptNumber: {
        startsWith: yearPrefix,
      },
    },
  });

  const nextSeq = (count + 1).toString().padStart(6, "0");
  return `${yearPrefix}${nextSeq}`;
}

export interface CheckDuplicateCashInput {
  studentId: string;
  amount: string;
  recordedById: string;
}

export async function checkDuplicateCash(input: CheckDuplicateCashInput) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const parsedAmount = new Decimal(input.amount);

  const match = await prisma.manualCredit.findFirst({
    where: {
      studentId: input.studentId,
      amount: parsedAmount,
      recordedById: input.recordedById,
      recordedAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    include: {
      receipt: true,
      student: true,
    },
  });

  if (match) {
    return {
      isDuplicate: true,
      existingReceiptNumber: match.receipt?.receiptNumber,
      recordedAt: match.recordedAt,
      studentName: `${match.student.firstName} ${match.student.lastName}`,
    };
  }

  return { isDuplicate: false };
}

export interface RecordManualCreditInput {
  studentId: string;
  amount: string; // Decimal string
  description: string;
  referenceNote?: string;
  reasonForDuplicate?: string;
  reasonForOverpayment?: string;
  termId: string;
}

export async function recordManualCredit(
  input: RecordManualCreditInput,
  actingUserId: string,
) {
  const paymentAmount = new Decimal(input.amount);
  if (paymentAmount.lessThanOrEqualTo(new Decimal("0.00"))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Amount must be greater than zero.",
    });
  }

  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
  });

  if (!student || !student.isActive) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Student not found or inactive." });
  }

  // 1. Check duplicate cash payment (Rule AUDIT-6 / D1-AC10)
  const dupCheck = await checkDuplicateCash({
    studentId: input.studentId,
    amount: input.amount,
    recordedById: actingUserId,
  });

  if (dupCheck.isDuplicate && !input.reasonForDuplicate?.trim()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `A cash payment of ₦${input.amount} was already recorded for this student today (Receipt: ${dupCheck.existingReceiptNumber}). Please provide a typed reason to confirm duplicate payment.`,
    });
  }

  // 2. Check overpayment threshold (Rule MONEY-6 / D1-AC2)
  const currentOutstanding = await computeOutstandingBalance(student.id, input.termId);
  const excess = paymentAmount.sub(currentOutstanding);
  const isOverpayment = excess.greaterThan(new Decimal("0.00"));
  const exceedsThreshold = excess.greaterThan(OVERPAYMENT_WARNING_THRESHOLD_NGN);

  if (exceedsThreshold && !input.reasonForOverpayment?.trim()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `This payment exceeds the outstanding balance by ₦${excess.toFixed(2)}. Please confirm this is correct and enter a reason.`,
    });
  }

  return await prisma.$transaction(async (tx) => {
    // Generate sequential receipt number
    const receiptNumber = await generateSequentialReceiptNumber(tx);

    // Create receipt first or concurrently
    const receipt = await tx.receipt.create({
      data: {
        receiptNumber,
        studentId: student.id,
        amount: paymentAmount,
        method: "CASH",
      },
    });

    const manualCredit = await tx.manualCredit.create({
      data: {
        studentId: student.id,
        amount: paymentAmount,
        description: input.description.trim(),
        referenceNote: input.referenceNote?.trim() || (input.reasonForOverpayment ? `Overpayment Reason: ${input.reasonForOverpayment}` : undefined),
        recordedById: actingUserId,
        receiptId: receipt.id,
      },
    });

    // If there is an overpayment, roll surplus into student.creditBalance (Rule MONEY-6 / MONEY-7)
    if (isOverpayment) {
      const newCreditBalance = student.creditBalance.add(excess);
      await tx.student.update({
        where: { id: student.id },
        data: { creditBalance: newCreditBalance },
      });
    }

    const isSensitive =
      dupCheck.isDuplicate ||
      exceedsThreshold ||
      input.description.toLowerCase().includes("waiver");

    await writeAuditLog(
      {
        userId: actingUserId,
        action: dupCheck.isDuplicate
          ? AUDIT_ACTIONS.DUPLICATE_PAYMENT_CONFIRMED
          : exceedsThreshold
          ? AUDIT_ACTIONS.OVERPAYMENT_OVERRIDE
          : input.description.toLowerCase().includes("waiver")
          ? AUDIT_ACTIONS.FEE_WAIVER_APPLIED
          : AUDIT_ACTIONS.MANUAL_CREDIT_CREATED,
        entity: "ManualCredit",
        entityId: manualCredit.id,
        metadata: {
          amount: manualCredit.amount,
          studentId: student.id,
          receiptNumber,
          isDuplicateConfirmed: dupCheck.isDuplicate,
          duplicateReason: input.reasonForDuplicate,
          overpaymentAmount: isOverpayment ? excess : undefined,
          overpaymentReason: input.reasonForOverpayment,
        },
        isSensitive,
      },
      tx,
    );

    return {
      manualCredit,
      receiptNumber,
      receiptId: receipt.id,
    };
  });
}

export async function getCashReceipt(receiptNumber: string) {
  const receipt = await prisma.receipt.findUnique({
    where: { receiptNumber },
    include: {
      student: true,
      manualCredit: {
        include: {
          recordedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      payment: true,
    },
  });

  if (!receipt) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found." });
  }

  return receipt;
}
