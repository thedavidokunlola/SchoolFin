// src/server/services/students/index.ts
// Student management and financial profile services

import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { computeOutstandingBalance } from "@/server/services/balance";
import { decrypt, encrypt } from "@/server/services/encryption";

export interface CreateStudentInput {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  class: string;
  photoUrl?: string;
}

export async function createStudent(input: CreateStudentInput, actingUserId: string) {
  const existing = await prisma.student.findUnique({
    where: { admissionNumber: input.admissionNumber.trim() },
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `A student with admission number ${input.admissionNumber} already exists.`,
    });
  }

  return await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        admissionNumber: input.admissionNumber.trim(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        class: input.class.trim(),
        photoUrl: input.photoUrl,
      },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.STUDENT_CREATED,
        entity: "Student",
        entityId: student.id,
        metadata: {
          admissionNumber: student.admissionNumber,
          class: student.class,
        },
        isSensitive: false,
      },
      tx,
    );

    return student;
  });
}

export interface UpdateStudentInput {
  id: string;
  admissionNumber?: string;
  firstName?: string;
  lastName?: string;
  class?: string;
  isActive?: boolean;
  photoUrl?: string;
}

export async function updateStudent(input: UpdateStudentInput, actingUserId: string) {
  const existing = await prisma.student.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Student not found." });
  }

  // If admissionNumber is changing, verify uniqueness
  if (
    input.admissionNumber &&
    input.admissionNumber.trim() !== existing.admissionNumber
  ) {
    const duplicate = await prisma.student.findUnique({
      where: { admissionNumber: input.admissionNumber.trim() },
    });
    if (duplicate) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `A student with admission number ${input.admissionNumber} already exists.`,
      });
    }
  }

  return await prisma.$transaction(async (tx) => {
    const student = await tx.student.update({
      where: { id: input.id },
      data: {
        ...(input.admissionNumber ? { admissionNumber: input.admissionNumber.trim() } : {}),
        ...(input.firstName ? { firstName: input.firstName.trim() } : {}),
        ...(input.lastName ? { lastName: input.lastName.trim() } : {}),
        ...(input.class ? { class: input.class.trim() } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
      },
    });

    const action =
      input.isActive === false
        ? AUDIT_ACTIONS.STUDENT_DEACTIVATED
        : input.isActive === true && existing.isActive === false
        ? AUDIT_ACTIONS.STUDENT_REACTIVATED
        : AUDIT_ACTIONS.STUDENT_UPDATED;

    await writeAuditLog(
      {
        userId: actingUserId,
        action,
        entity: "Student",
        entityId: student.id,
        metadata: { changes: input, previousState: existing },
        isSensitive: false,
      },
      tx,
    );

    return student;
  });
}

export async function deactivateStudent(studentId: string, actingUserId: string) {
  return await prisma.$transaction(async (tx) => {
    const student = await tx.student.update({
      where: { id: studentId },
      data: { isActive: false },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.STUDENT_DEACTIVATED,
        entity: "Student",
        entityId: student.id,
        isSensitive: false,
      },
      tx,
    );

    return student;
  });
}

export async function deleteStudent(
  studentId: string,
  actingUserId: string,
  force = false,
) {
  return await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: studentId },
      include: {
        _count: {
          select: {
            feePostings: true,
            payments: true,
            manualCredits: true,
            installments: true,
            receipts: true,
          },
        },
      },
    });

    if (!student) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Student account not found.",
      });
    }

    const hasFinancialRecords =
      student._count.feePostings > 0 ||
      student._count.payments > 0 ||
      student._count.manualCredits > 0 ||
      student._count.installments > 0 ||
      student._count.receipts > 0;

    if (hasFinancialRecords && !force) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot delete '${student.firstName} ${student.lastName}' because they have ${student._count.feePostings} fee posting(s) and ${student._count.payments + student._count.manualCredits} payment record(s). Deactivate the student or enable Force Delete if you wish to cascade remove all records.`,
      });
    }

    // Cascade remove linked records if force is true
    if (hasFinancialRecords && force) {
      await tx.debtCollectionEvent.deleteMany({ where: { studentId } });
      await tx.notification.deleteMany({ where: { studentId } });
      await tx.studentNote.deleteMany({ where: { studentId } });
      await tx.installment.deleteMany({ where: { studentId } });
      await tx.receipt.deleteMany({ where: { studentId } });
      await tx.manualCredit.deleteMany({ where: { studentId } });
      await tx.payment.deleteMany({ where: { studentId } });
      await tx.feePosting.deleteMany({ where: { studentId } });
    }

    // Always delete parent student link
    await tx.parentStudentLink.deleteMany({ where: { studentId } });
    await tx.student.delete({ where: { id: studentId } });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.STUDENT_DELETED,
        entity: "Student",
        entityId: studentId,
        metadata: {
          admissionNumber: student.admissionNumber,
          name: `${student.firstName} ${student.lastName}`,
          force,
        },
        isSensitive: true,
      },
      tx,
    );

    return { success: true };
  });
}

export async function getStudentProfile(studentId: string, termId?: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      parentLinks: {
        where: { isActive: true },
        include: {
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              isActive: true,
            },
          },
        },
      },
      feePostings: {
        orderBy: { postedAt: "desc" },
        include: {
          term: true,
          feeStructure: true,
          postedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        include: { receipt: true },
      },
      manualCredits: {
        orderBy: { recordedAt: "desc" },
        include: {
          recordedBy: {
            select: { firstName: true, lastName: true },
          },
          receipt: true,
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { firstName: true, lastName: true, role: true } },
        },
      },
    },
  });

  if (!student) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Student not found." });
  }

  // Active term or provided term
  let activeTermId = termId;
  if (!activeTermId) {
    const activeTerm = await prisma.academicTerm.findFirst({
      where: { isActive: true },
    });
    activeTermId = activeTerm?.id;
  }

  const outstandingBalance = activeTermId
    ? await computeOutstandingBalance(student.id, activeTermId)
    : null;

  // Decrypt parent phone numbers
  const decryptedParents = student.parentLinks.map((link) => ({
    ...link,
    parent: {
      ...link.parent,
      phone: link.parent.phone ? decrypt(link.parent.phone) : null,
    },
  }));

  return {
    ...student,
    parentLinks: decryptedParents,
    outstandingBalance,
    activeTermId,
  };
}

export async function listStudents(params: {
  search?: string;
  class?: string;
  isActive?: boolean;
  take?: number;
  skip?: number;
}) {
  const where: import("@prisma/client").Prisma.StudentWhereInput = {
    ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
    ...(params.class ? { class: params.class } : {}),
    ...(params.search
      ? {
          OR: [
            { firstName: { contains: params.search, mode: "insensitive" } },
            { lastName: { contains: params.search, mode: "insensitive" } },
            { admissionNumber: { contains: params.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: [{ class: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      take: params.take ?? 50,
      skip: params.skip ?? 0,
      include: {
        parentLinks: {
          where: { isActive: true },
          include: {
            parent: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    }),
  ]);

  return { total, students };
}

export async function linkParentToStudent(
  parentId: string,
  studentId: string,
  relationship = "Parent",
  actingUserId: string,
) {
  return await prisma.$transaction(async (tx) => {
    const link = await tx.parentStudentLink.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      update: { isActive: true, relationship },
      create: { parentId, studentId, relationship, isActive: true },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.PARENT_STUDENT_LINKED,
        entity: "ParentStudentLink",
        entityId: link.id,
        metadata: { parentId, studentId, relationship },
        isSensitive: false,
      },
      tx,
    );

    return link;
  });
}

export async function unlinkParentFromStudent(
  parentId: string,
  studentId: string,
  actingUserId: string,
) {
  return await prisma.$transaction(async (tx) => {
    const link = await tx.parentStudentLink.update({
      where: { parentId_studentId: { parentId, studentId } },
      data: { isActive: false },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.PARENT_STUDENT_UNLINKED,
        entity: "ParentStudentLink",
        entityId: link.id,
        metadata: { parentId, studentId },
        isSensitive: false,
      },
      tx,
    );

    return link;
  });
}

export async function addStudentNote(
  studentId: string,
  content: string,
  authorId: string,
) {
  return await prisma.studentNote.create({
    data: {
      studentId,
      content,
      authorId,
    },
  });
}
