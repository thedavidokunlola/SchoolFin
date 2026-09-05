// src/server/services/terms/index.ts
// Academic term management service

import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";

export interface CreateAcademicTermInput {
  name: string;
  startDate: Date;
  endDate: Date;
  paymentDueDate?: Date | null;
  isActive?: boolean;
}

export async function createAcademicTerm(
  input: CreateAcademicTermInput,
  actingUserId: string,
) {
  return await prisma.$transaction(async (tx) => {
    // If setting active, deactivate others
    if (input.isActive) {
      await tx.academicTerm.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const term = await tx.academicTerm.create({
      data: {
        name: input.name.trim(),
        startDate: input.startDate,
        endDate: input.endDate,
        paymentDueDate: input.paymentDueDate,
        isActive: input.isActive ?? false,
      },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.TERM_CREATED,
        entity: "AcademicTerm",
        entityId: term.id,
        metadata: {
          name: term.name,
          isActive: term.isActive,
          paymentDueDate: term.paymentDueDate,
        },
        isSensitive: false,
      },
      tx,
    );

    return term;
  });
}

export async function listAcademicTerms() {
  return await prisma.academicTerm.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: {
        select: { feeStructures: true, feePostings: true },
      },
    },
  });
}

export async function setActiveTerm(termId: string, actingUserId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.academicTerm.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const term = await tx.academicTerm.update({
      where: { id: termId },
      data: { isActive: true },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.TERM_SET_ACTIVE,
        entity: "AcademicTerm",
        entityId: term.id,
        metadata: { name: term.name },
        isSensitive: false,
      },
      tx,
    );

    return term;
  });
}

export async function setPaymentDueDate(
  termId: string,
  paymentDueDate: Date,
  actingUserId: string,
) {
  return await prisma.$transaction(async (tx) => {
    const term = await tx.academicTerm.update({
      where: { id: termId },
      data: { paymentDueDate },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.TERM_UPDATED,
        entity: "AcademicTerm",
        entityId: term.id,
        metadata: { paymentDueDate },
        isSensitive: false,
      },
      tx,
    );

    return term;
  });
}

export interface UpdateAcademicTermInput {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  paymentDueDate?: Date | null;
  isActive?: boolean;
}

export async function updateAcademicTerm(
  input: UpdateAcademicTermInput,
  actingUserId: string,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.academicTerm.findUnique({
      where: { id: input.id },
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Academic term not found.",
      });
    }

    if (input.isActive && !existing.isActive) {
      await tx.academicTerm.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const term = await tx.academicTerm.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        startDate: input.startDate,
        endDate: input.endDate,
        paymentDueDate: input.paymentDueDate,
        isActive: input.isActive ?? existing.isActive,
      },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.TERM_UPDATED,
        entity: "AcademicTerm",
        entityId: term.id,
        metadata: {
          previousName: existing.name,
          newName: term.name,
          startDate: term.startDate,
          endDate: term.endDate,
          paymentDueDate: term.paymentDueDate,
          isActive: term.isActive,
        },
        isSensitive: false,
      },
      tx,
    );

    return term;
  });
}

export async function deleteAcademicTerm(
  termId: string,
  actingUserId: string,
  force = false,
) {
  return await prisma.$transaction(async (tx) => {
    const term = await tx.academicTerm.findUnique({
      where: { id: termId },
      include: {
        _count: {
          select: {
            feePostings: true,
            feeStructures: true,
            installments: true,
            debtRules: true,
          },
        },
      },
    });

    if (!term) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Academic term not found.",
      });
    }

    const hasLinkedRecords =
      term._count.feePostings > 0 ||
      term._count.feeStructures > 0 ||
      term._count.installments > 0 ||
      term._count.debtRules > 0;

    if (hasLinkedRecords && !force) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot delete '${term.name}' because it contains ${term._count.feePostings} fee posting(s) and ${term._count.feeStructures} fee structure(s). Enable Force Delete if you wish to cascade remove all associated records.`,
      });
    }

    // Cascade delete if force is enabled
    if (hasLinkedRecords && force) {
      // 1. Delete installments
      await tx.installment.deleteMany({
        where: { termId },
      });

      // 2. Delete fee postings
      await tx.feePosting.deleteMany({
        where: { termId },
      });

      // 3. Delete fee structure line items & structures
      const structures = await tx.feeStructure.findMany({
        where: { termId },
        select: { id: true },
      });
      const structureIds = structures.map((s) => s.id);
      if (structureIds.length > 0) {
        await tx.feeLineItem.deleteMany({
          where: { feeStructureId: { in: structureIds } },
        });
        await tx.feeStructure.deleteMany({
          where: { id: { in: structureIds } },
        });
      }

      // 4. Delete debt collection rules
      await tx.debtCollectionRule.deleteMany({
        where: { termId },
      });
    }

    await tx.academicTerm.delete({
      where: { id: termId },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.TERM_DELETED,
        entity: "AcademicTerm",
        entityId: termId,
        metadata: {
          name: term.name,
          force,
          deletedPostingsCount: term._count.feePostings,
          deletedStructuresCount: term._count.feeStructures,
        },
        isSensitive: true,
      },
      tx,
    );

    return { success: true };
  });
}

