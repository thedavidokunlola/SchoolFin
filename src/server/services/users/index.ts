// src/server/services/users/index.ts
// Staff and user account management services

import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS, type UserRole } from "@/lib/constants";
import { encrypt, decrypt } from "@/server/services/encryption";
import { createParentInvite } from "@/server/services/auth";

export interface CreateStaffInput {
  email: string;
  firstName: string;
  lastName: string;
  role: "BURSAR" | "ACCOUNTANT" | "PROPRIETOR";
  phone?: string;
  password?: string;
}

export async function createStaffAccount(
  input: CreateStaffInput,
  actingUserId: string,
) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A user with this email address already exists.",
    });
  }

  const defaultPassword = input.password || "SchoolFin@123";
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);
  const encryptedPhone = input.phone ? encrypt(input.phone.trim()) : null;

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: input.role,
        hashedPassword,
        phone: encryptedPhone,
        isActive: true,
      },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.USER_CREATED,
        entity: "User",
        entityId: user.id,
        metadata: { email: user.email, role: user.role },
        isSensitive: user.role === "PROPRIETOR" || user.role === "BURSAR",
      },
      tx,
    );

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  });
}

export interface CreateParentInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  studentId?: string;
  relationship?: string;
}

export async function createParentAccount(
  input: CreateParentInput,
  actingUserId: string,
) {
  const email = input.email.toLowerCase().trim();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  const parent = await prisma.$transaction(async (tx) => {
    let parentUser = existingUser;
    if (!parentUser) {
      // Create user with unassigned password (must accept invite)
      const dummyHash = await bcrypt.hash(Math.random().toString(), 12);
      const encryptedPhone = input.phone ? encrypt(input.phone.trim()) : null;

      parentUser = await tx.user.create({
        data: {
          email,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          role: "PARENT",
          hashedPassword: dummyHash,
          phone: encryptedPhone,
          isActive: false, // Inactive until invite accepted per AUTH-4
        },
      });

      await writeAuditLog(
        {
          userId: actingUserId,
          action: AUDIT_ACTIONS.USER_CREATED,
          entity: "User",
          entityId: parentUser.id,
          metadata: { email: parentUser.email, role: "PARENT" },
          isSensitive: false,
        },
        tx,
      );
    }

    if (input.studentId) {
      await tx.parentStudentLink.upsert({
        where: {
          parentId_studentId: {
            parentId: parentUser.id,
            studentId: input.studentId,
          },
        },
        update: { isActive: true, relationship: input.relationship ?? "Parent" },
        create: {
          parentId: parentUser.id,
          studentId: input.studentId,
          relationship: input.relationship ?? "Parent",
          isActive: true,
        },
      });
    }

    return parentUser;
  });

  // Generate invite token AFTER transaction has committed to database
  const invite = await createParentInvite(parent.id, actingUserId);

  return {
    id: parent.id,
    email: parent.email,
    firstName: parent.firstName,
    lastName: parent.lastName,
    inviteToken: invite.inviteToken,
    expiresAt: invite.expiresAt,
  };
}

export async function listStaffAccounts() {
  const staff = await prisma.user.findMany({
    where: {
      role: { in: ["BURSAR", "ACCOUNTANT", "PROPRIETOR"] },
    },
    orderBy: [{ role: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
  });

  return staff.map((u) => ({
    ...u,
    phone: u.phone ? decrypt(u.phone) : null,
  }));
}

export async function listParentAccounts(params?: { search?: string }) {
  const parents = await prisma.user.findMany({
    where: {
      role: "PARENT",
      ...(params?.search
        ? {
            OR: [
              { email: { contains: params.search, mode: "insensitive" } },
              { firstName: { contains: params.search, mode: "insensitive" } },
              { lastName: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      parentLinks: {
        where: { isActive: true },
        include: { student: true },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return parents.map((p) => ({
    id: p.id,
    email: p.email,
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone ? decrypt(p.phone) : null,
    isActive: p.isActive,
    students: p.parentLinks.map((l) => l.student),
  }));
}

export async function getParentChildren(parentId: string) {
  const links = await prisma.parentStudentLink.findMany({
    where: {
      parentId,
      isActive: true,
      student: { isActive: true },
    },
    include: {
      student: true,
    },
    orderBy: {
      student: { firstName: "asc" },
    },
  });

  return links.map((link) => ({
    ...link.student,
    relationship: link.relationship,
  }));
}

export async function deactivateUserAccount(
  userId: string,
  actingUserId: string,
) {
  if (userId === actingUserId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You cannot deactivate your own account.",
    });
  }

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    await writeAuditLog(
      {
        userId: actingUserId,
        action: AUDIT_ACTIONS.USER_DEACTIVATED,
        entity: "User",
        entityId: user.id,
        metadata: { email: user.email, role: user.role },
        isSensitive: user.role !== "PARENT",
      },
      tx,
    );

    return user;
  });
}

export interface UpdateUserProfileInput {
  firstName: string;
  lastName: string;
  phone?: string;
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput,
) {
  const encryptedPhone =
    input.phone && input.phone.trim().length > 0
      ? encrypt(input.phone.trim())
      : null;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      ...(input.phone !== undefined ? { phone: encryptedPhone } : {}),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: AUDIT_ACTIONS.USER_UPDATED,
    entity: "User",
    entityId: user.id,
    metadata: { firstName: user.firstName, lastName: user.lastName },
    isSensitive: false,
  });

  return {
    ...user,
    phone: user.phone ? decrypt(user.phone) : null,
  };
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export async function changeUserPassword(
  userId: string,
  input: ChangePasswordInput,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User account not found.",
    });
  }

  const isCurrentValid = await bcrypt.compare(
    input.currentPassword,
    user.hashedPassword,
  );

  if (!isCurrentValid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Current password is incorrect.",
    });
  }

  const hashedPassword = await bcrypt.hash(input.newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword },
  });

  await writeAuditLog({
    userId: user.id,
    action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
    entity: "User",
    entityId: user.id,
    metadata: { reason: "Self-service password update" },
    isSensitive: false,
  });

  return { success: true };
}
