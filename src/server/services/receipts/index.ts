// src/server/services/receipts/index.ts
// Public receipt verification service (Module L1 / Rule SEC-5)

import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { schoolConfig } from "@/../../school.config";

export async function verifyReceiptPublic(receiptNumber: string) {
  const receipt = await prisma.receipt.findUnique({
    where: { receiptNumber: receiptNumber.trim() },
    include: {
      student: {
        select: {
          firstName: true, // First name ONLY per Rule SEC-5 / Module L1-AC3
        },
      },
    },
  });

  if (!receipt) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Receipt not found. If you believe this is an error, contact the school.",
    });
  }

  return {
    receiptNumber: receipt.receiptNumber,
    studentFirstName: receipt.student.firstName,
    amountPaid: receipt.amount.toString(),
    dateOfPayment: receipt.issuedAt,
    paymentMethod: receipt.method,
    schoolName: schoolConfig.name,
    schoolAddress: schoolConfig.address,
  };
}
