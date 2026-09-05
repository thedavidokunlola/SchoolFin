// src/server/services/installments/index.ts
// Installment plans and schedules service
// Locked per PRD §9 schema, Module F1, F2, F3, and Rule PAY-5, PAY-6

import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { Decimal } from "@prisma/client/runtime/library";
import { computeOutstandingBalance } from "@/server/services/balance";
import { encrypt } from "@/server/services/encryption";

export interface CreatePlanTemplateInput {
  name: string;
  description?: string;
  numberOfParts: number; // e.g. 2 or 3
  createdById: string;
}

export async function createInstallmentPlanTemplate(input: CreatePlanTemplateInput) {
  if (input.numberOfParts < 2 || input.numberOfParts > 6) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Number of installment parts must be between 2 and 6",
    });
  }

  const plan = await prisma.installmentPlan.create({
    data: {
      name: input.name,
      description: input.description,
      numberOfParts: input.numberOfParts,
      isActive: true,
    },
  });

  await writeAuditLog({
    userId: input.createdById,
    action: AUDIT_ACTIONS.INSTALLMENT_PLAN_CREATED,
    entity: "InstallmentPlan",
    entityId: plan.id,
    metadata: { name: plan.name, numberOfParts: plan.numberOfParts },
  });

  return plan;
}

export async function getInstallmentPlans() {
  return prisma.installmentPlan.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export interface SelectPlanForStudentInput {
  studentId: string;
  planId: string;
  termId: string;
  selectedById: string;
}

export async function selectStudentInstallmentPlan(input: SelectPlanForStudentInput) {
  const [plan, student, balance] = await Promise.all([
    prisma.installmentPlan.findUnique({ where: { id: input.planId } }),
    prisma.student.findUnique({ where: { id: input.studentId } }),
    computeOutstandingBalance(input.studentId, input.termId),
  ]);

  if (!plan || !plan.isActive) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Installment plan not found" });
  }

  if (!student || !student.isActive) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
  }

  if (balance.lte(0)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Student has no outstanding balance to schedule for installments",
    });
  }

  // Calculate installment breakdown
  const totalAmount = balance;
  const parts = plan.numberOfParts;
  const partAmount = totalAmount.div(parts).toDecimalPlaces(2);

  return prisma.$transaction(async (tx) => {
    // Remove previous pending installments for this term if any
    await tx.installment.deleteMany({
      where: {
        studentId: input.studentId,
        termId: input.termId,
        paidAt: null,
      },
    });

    const now = new Date();
    let accumulated = new Decimal(0);

    for (let i = 0; i < parts; i++) {
      let amountDue: Decimal;

      if (i === parts - 1) {
        // Last part gets exact remainder to eliminate rounding discrepancies
        amountDue = totalAmount.sub(accumulated);
      } else {
        amountDue = partAmount;
        accumulated = accumulated.add(amountDue);
      }

      const dueDate = new Date(now.getTime() + i * 30 * 24 * 60 * 60 * 1000);

      await tx.installment.create({
        data: {
          studentId: input.studentId,
          planId: plan.id,
          termId: input.termId,
          partNumber: i + 1,
          amountDue,
          dueDate,
          failedAttempts: 0,
          isFlagged: false,
          isPaused: false,
        },
      });
    }

    await writeAuditLog(
      {
        userId: input.selectedById,
        action: AUDIT_ACTIONS.INSTALLMENT_PLAN_SELECTED,
        entity: "InstallmentPlan",
        entityId: plan.id,
        metadata: {
          studentId: input.studentId,
          planName: plan.name,
          totalAmount: totalAmount.toString(),
          partsCount: parts,
        },
      },
      tx,
    );

    return tx.installment.findMany({
      where: {
        studentId: input.studentId,
        termId: input.termId,
      },
      include: {
        plan: true,
      },
      orderBy: { partNumber: "asc" },
    });
  });
}

export async function getStudentInstallments(studentId: string) {
  return prisma.installment.findMany({
    where: { studentId },
    include: {
      plan: true,
      term: true,
    },
    orderBy: { partNumber: "asc" },
  });
}
