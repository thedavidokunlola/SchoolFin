// src/server/services/fees/index.ts
// Fee structures and fee posting service
// Locked per fee-posting-rules.md and PRD Module C

import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { Decimal } from "@prisma/client/runtime/library";

export interface FeeLineItemInput {
  label: string;
  amount: string; // Decimal string
  isOptional?: boolean;
}

export interface CreateFeeStructureInput {
  name: string;
  class: string;
  termId: string;
  lineItems: FeeLineItemInput[];
}

export async function createFeeStructure(
  input: CreateFeeStructureInput,
  actingUserId: string,
) {
  let total = new Decimal("0.00");
  for (const item of input.lineItems) {
    total = total.add(new Decimal(item.amount));
  }

  return await prisma.$transaction(async (tx) => {
    const feeStructure = await tx.feeStructure.create({
      data: {
        name: input.name.trim(),
        class: input.class.trim(),
        termId: input.termId,
        totalAmount: total,
        lineItems: {
          create: input.lineItems.map((item) => ({
            label: item.label.trim(),
            amount: new Decimal(item.amount),
            isOptional: item.isOptional ?? false,
          })),
        },
      },
      include: { lineItems: true },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.FEE_STRUCTURE_CREATED,
        entity: "FeeStructure",
        entityId: feeStructure.id,
        metadata: {
          name: feeStructure.name,
          class: feeStructure.class,
          totalAmount: feeStructure.totalAmount,
        },
        isSensitive: false,
      },
      tx,
    );

    return feeStructure;
  });
}

export async function listFeeStructures(termId?: string, className?: string) {
  return await prisma.feeStructure.findMany({
    where: {
      isActive: true,
      ...(termId ? { termId } : {}),
      ...(className ? { class: className } : {}),
    },
    include: {
      lineItems: true,
      term: true,
      _count: {
        select: {
          postings: true,
        },
      },
    },
    orderBy: [{ class: "asc" }, { name: "asc" }],
  });
}

export interface UpdateFeeStructureInput {
  id: string;
  name: string;
  class: string;
  termId: string;
  lineItems: FeeLineItemInput[];
}

export async function updateFeeStructure(
  input: UpdateFeeStructureInput,
  actingUserId: string,
) {
  const existing = await prisma.feeStructure.findUnique({
    where: { id: input.id },
    include: { lineItems: true },
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Fee structure not found.",
    });
  }

  let total = new Decimal("0.00");
  for (const item of input.lineItems) {
    total = total.add(new Decimal(item.amount));
  }

  return await prisma.$transaction(async (tx) => {
    // Delete existing line items
    await tx.feeLineItem.deleteMany({
      where: { feeStructureId: input.id },
    });

    const feeStructure = await tx.feeStructure.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        class: input.class.trim(),
        termId: input.termId,
        totalAmount: total,
        lineItems: {
          create: input.lineItems.map((item) => ({
            label: item.label.trim(),
            amount: new Decimal(item.amount),
            isOptional: item.isOptional ?? false,
          })),
        },
      },
      include: { lineItems: true, term: true },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.FEE_STRUCTURE_UPDATED,
        entity: "FeeStructure",
        entityId: feeStructure.id,
        metadata: {
          name: feeStructure.name,
          class: feeStructure.class,
          totalAmount: feeStructure.totalAmount,
        },
        isSensitive: false,
      },
      tx,
    );

    return feeStructure;
  });
}

export async function deleteFeeStructure(
  structureId: string,
  actingUserId: string,
  force = false,
) {
  return await prisma.$transaction(async (tx) => {
    const feeStructure = await tx.feeStructure.findUnique({
      where: { id: structureId },
      include: {
        _count: {
          select: {
            postings: true,
          },
        },
      },
    });

    if (!feeStructure) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Fee structure not found.",
      });
    }

    if (feeStructure._count.postings > 0 && !force) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot delete fee structure '${feeStructure.name}' because it has been posted to ${feeStructure._count.postings} student account(s). Enable Force Delete to cascade remove all associated fee postings or edit the structure instead.`,
      });
    }

    if (feeStructure._count.postings > 0 && force) {
      await tx.feePosting.deleteMany({
        where: { feeStructureId: structureId },
      });
    }

    await tx.feeLineItem.deleteMany({
      where: { feeStructureId: structureId },
    });

    await tx.feeStructure.delete({
      where: { id: structureId },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.FEE_STRUCTURE_DELETED,
        entity: "FeeStructure",
        entityId: structureId,
        metadata: {
          name: feeStructure.name,
          class: feeStructure.class,
          force,
        },
        isSensitive: true,
      },
      tx,
    );

    return { success: true };
  });
}

export interface PostFeeToStudentInput {
  studentId: string;
  feeStructureId: string;
  termId: string;
  description: string;
}

export async function postFeeToStudent(
  input: PostFeeToStudentInput,
  actingUserId: string,
) {
  const [student, feeStructure] = await Promise.all([
    prisma.student.findUnique({ where: { id: input.studentId } }),
    prisma.feeStructure.findUnique({
      where: { id: input.feeStructureId },
      include: { lineItems: true },
    }),
  ]);

  if (!student || !student.isActive) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Student not found or inactive." });
  }

  if (!feeStructure || !feeStructure.isActive) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Fee structure not found or inactive." });
  }

  // Duplicate Check: Rule MONEY-3 / C2-AC6
  const existingPosting = await prisma.feePosting.findFirst({
    where: {
      studentId: input.studentId,
      feeStructureId: input.feeStructureId,
      termId: input.termId,
      type: "CHARGE",
    },
  });

  if (existingPosting) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `This fee structure has already been posted to ${student.firstName} ${student.lastName} for this term. Create a new fee structure if you need to post a supplementary charge.`,
    });
  }

  return await prisma.$transaction(async (tx) => {
    // Check if student has creditBalance to auto-apply per Rule MONEY-7
    const currentCredit = student.creditBalance;
    const zero = new Decimal("0.00");

    if (currentCredit.greaterThan(zero)) {
      // Zero out student creditBalance
      await tx.student.update({
        where: { id: student.id },
        data: { creditBalance: zero },
      });

      await writeAuditLog(
        {
          userId: actingUserId,
          action: AUDIT_ACTIONS.CREDIT_BALANCE_APPLIED,
          entity: "Student",
          entityId: student.id,
          metadata: {
            appliedAmount: currentCredit,
            studentId: student.id,
            feeStructureId: feeStructure.id,
          },
          isSensitive: false,
        },
        tx,
      );
    }

    const posting = await tx.feePosting.create({
      data: {
        studentId: student.id,
        termId: input.termId,
        feeStructureId: feeStructure.id,
        description: input.description.trim(),
        amount: feeStructure.totalAmount,
        type: "CHARGE",
        postedById: actingUserId,
      },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.FEE_POSTED_INDIVIDUAL,
        entity: "FeePosting",
        entityId: posting.id,
        metadata: {
          studentId: student.id,
          feeStructureId: feeStructure.id,
          amount: posting.amount,
        },
        isSensitive: false,
      },
      tx,
    );

    return posting;
  });
}

export interface PostFeeToClassInput {
  class: string;
  feeStructureId: string;
  termId: string;
  description: string;
}

export async function postFeeToClass(
  input: PostFeeToClassInput,
  actingUserId: string,
) {
  const [feeStructure, activeStudents] = await Promise.all([
    prisma.feeStructure.findUnique({
      where: { id: input.feeStructureId },
    }),
    prisma.student.findMany({
      where: {
        class: input.class.trim(),
        isActive: true,
      },
    }),
  ]);

  if (!feeStructure || !feeStructure.isActive) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Fee structure not found or inactive." });
  }

  if (activeStudents.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `No active students found in class ${input.class}.` });
  }

  // Check for any students who already have this fee structure posted
  const studentIds = activeStudents.map((s) => s.id);
  const existingPostings = await prisma.feePosting.findMany({
    where: {
      studentId: { in: studentIds },
      feeStructureId: input.feeStructureId,
      termId: input.termId,
      type: "CHARGE",
    },
    include: { student: true },
  });

  if (existingPostings.length > 0) {
    const alreadyPostedNames = existingPostings
      .map((p) => `${p.student.firstName} ${p.student.lastName}`)
      .join(", ");
    throw new TRPCError({
      code: "CONFLICT",
      message: `Cannot post: Fee structure has already been posted to student(s): ${alreadyPostedNames}. Duplicate posting is blocked.`,
    });
  }

  return await prisma.$transaction(async (tx) => {
    const zero = new Decimal("0.00");
    const postedRecords = [];

    for (const student of activeStudents) {
      if (student.creditBalance.greaterThan(zero)) {
        await tx.student.update({
          where: { id: student.id },
          data: { creditBalance: zero },
        });

        await writeAuditLog(
          {
            userId: actingUserId,
            action: AUDIT_ACTIONS.CREDIT_BALANCE_APPLIED,
            entity: "Student",
            entityId: student.id,
            metadata: {
              appliedAmount: student.creditBalance,
              studentId: student.id,
            },
            isSensitive: false,
          },
          tx,
        );
      }

      const posting = await tx.feePosting.create({
        data: {
          studentId: student.id,
          termId: input.termId,
          feeStructureId: feeStructure.id,
          description: input.description.trim(),
          amount: feeStructure.totalAmount,
          type: "CHARGE",
          postedById: actingUserId,
        },
      });

      postedRecords.push(posting);
    }

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.FEE_POSTED_BULK,
        entity: "FeePosting",
        entityId: feeStructure.id,
        metadata: {
          class: input.class,
          affectedStudentsCount: activeStudents.length,
          totalAmountPerStudent: feeStructure.totalAmount,
        },
        isSensitive: false,
      },
      tx,
    );

    return {
      success: true,
      postedCount: postedRecords.length,
      class: input.class,
    };
  });
}

export async function reverseFeePosting(
  postingId: string,
  actingUserId: string,
) {
  const posting = await prisma.feePosting.findUnique({
    where: { id: postingId },
    include: { student: true, feeStructure: true },
  });

  if (!posting) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Fee posting not found." });
  }

  if (posting.type === "REVERSAL") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot reverse an existing reversal." });
  }

  // 24-hour reversal window check per Rule MONEY-5 / C2-AC8
  const now = new Date();
  const diffHours = (now.getTime() - posting.postedAt.getTime()) / (1000 * 60 * 60);

  if (diffHours > 24) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Contact your system administrator to reverse postings older than 24 hours.",
    });
  }

  return await prisma.$transaction(async (tx) => {
    // Create new FeePosting with type REVERSAL (never delete or update original)
    const reversal = await tx.feePosting.create({
      data: {
        studentId: posting.studentId,
        termId: posting.termId,
        feeStructureId: posting.feeStructureId,
        description: `Reversal of charge: ${posting.description}`,
        amount: posting.amount,
        type: "REVERSAL",
        postedById: actingUserId,
      },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.FEE_POSTING_REVERSED,
        entity: "FeePosting",
        entityId: reversal.id,
        metadata: {
          originalPostingId: posting.id,
          studentId: posting.studentId,
          amount: posting.amount,
        },
        isSensitive: true,
      },
      tx,
    );

    return reversal;
  });
}
