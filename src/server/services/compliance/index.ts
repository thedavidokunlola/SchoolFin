// src/server/services/compliance/index.ts
// NDPA Compliance & Data Subject Rights service (Module J2, Rule AUDIT-3)

import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { decrypt } from "@/server/services/encryption";

export async function exportSubjectData(userId: string, requestingUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      parentLinks: {
        include: {
          student: {
            include: {
              feePostings: true,
              payments: { include: { receipt: true } },
              manualCredits: { include: { receipt: true } },
              installments: true,
              notes: true,
            },
          },
        },
      },
      auditLogs: true,
    },
  });

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  const exportPayload = {
    exportDate: new Date().toISOString(),
    regulation: "Nigeria Data Protection Act (NDPA)",
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ? decrypt(user.phone) : null,
      role: user.role,
      createdAt: user.createdAt,
    },
    associatedStudents: user.parentLinks.map((link) => ({
      studentId: link.student.id,
      admissionNumber: link.student.admissionNumber,
      firstName: link.student.firstName,
      lastName: link.student.lastName,
      class: link.student.class,
      financialRecords: {
        feePostings: link.student.feePostings,
        payments: link.student.payments,
        manualCredits: link.student.manualCredits,
        installments: link.student.installments,
      },
    })),
  };

  await writeAuditLog({
    userId: requestingUserId,
    action: AUDIT_ACTIONS.PII_ACCESSED,
    entity: "User",
    entityId: user.id,
    metadata: { exportedFor: user.email, reason: "NDPA Data Subject Access Request" },
    isSensitive: true,
  });

  return exportPayload;
}

export async function anonymiseSubjectData(params: {
  userId: string;
  requestingUserId: string;
  reason: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
  });

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  const anonymisedId = user.id.substring(0, 8);
  const anonymisedEmail = `anonymised-${anonymisedId}@schoolfin.local`;

  // Anonymise user records while preserving financial ledger integrity (Rule AUDIT-5 append-only soft action)
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: "ANONYMISED",
      lastName: "USER",
      email: anonymisedEmail,
      phone: null,
      isActive: false,
    },
  });

  await writeAuditLog({
    userId: params.requestingUserId,
    action: AUDIT_ACTIONS.PII_ANONYMISED,
    entity: "User",
    entityId: user.id,
    metadata: {
      originalId: user.id,
      reason: params.reason,
      regulation: "NDPA Right to Erasure / Anonymisation",
    },
    isSensitive: true,
  });

  return updatedUser;
}
