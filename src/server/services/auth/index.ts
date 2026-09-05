// src/server/services/auth/index.ts
// Authentication, password reset, and parent invite services

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { redis } from "@/lib/redis";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";

const RESET_TOKEN_TTL_SECONDS = 30 * 60; // 30 minutes
const INVITE_TOKEN_TTL_SECONDS = 48 * 60 * 60; // 48 hours

export async function requestPasswordReset(emailInput: string): Promise<{ success: boolean; message: string }> {
  const email = emailInput.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // Generic message returned regardless of whether user exists per AUTH-7 / A2-AC2
  const genericResponse = {
    success: true,
    message: "If an account with that email exists, password reset instructions have been sent.",
  };

  if (!user || !user.isActive) {
    return genericResponse;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const redisKey = `pwd_reset:${resetToken}`;

  // Store in redis with single-use 30m TTL
  await redis.set(redisKey, user.id, "EX", RESET_TOKEN_TTL_SECONDS);

  await writeAuditLog({
    userId: user.id,
    action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
    entity: "User",
    entityId: user.id,
    metadata: { email: user.email },
    isSensitive: false,
  });

  return genericResponse;
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
  if (!token || newPassword.length < 8) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Password must be at least 8 characters long.",
    });
  }

  const redisKey = `pwd_reset:${token}`;
  const userId = await redis.get(redisKey);

  if (!userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Password reset link is invalid or has expired.",
    });
  }

  // Single-use: delete token immediately
  await redis.del(redisKey);

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { hashedPassword },
    });

    await writeAuditLog(
      {
        userId,
        action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
        entity: "User",
        entityId: userId,
        isSensitive: false,
      },
      tx,
    );
  });

  return { success: true };
}

export async function createParentInvite(
  parentId: string,
  actingUserId: string,
): Promise<{ inviteToken: string; expiresAt: Date }> {
  const parent = await prisma.user.findUnique({
    where: { id: parentId },
  });

  if (!parent || parent.role !== "PARENT") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Parent user not found.",
    });
  }

  const inviteToken = crypto.randomBytes(32).toString("hex");
  const redisKey = `parent_invite:${inviteToken}`;
  const parentKey = `parent_token_lookup:${parent.id}`;

  // Invalidate any existing invite token for this parent atomically
  const existingToken = await redis.get(parentKey);
  if (existingToken) {
    await redis.del(`parent_invite:${existingToken}`);
  }

  await redis.set(redisKey, parent.id, "EX", INVITE_TOKEN_TTL_SECONDS);
  await redis.set(parentKey, inviteToken, "EX", INVITE_TOKEN_TTL_SECONDS);

  const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_SECONDS * 1000);

  await writeAuditLog({
    userId: actingUserId,
    action: AUDIT_ACTIONS.PARENT_INVITE_SENT,
    entity: "User",
    entityId: parent.id,
    metadata: { parentEmail: parent.email },
    isSensitive: false,
  });

  return { inviteToken, expiresAt };
}

export async function acceptParentInvite(
  token: string,
  newPassword: string,
): Promise<{ success: boolean; email: string }> {
  if (!token || newPassword.length < 8) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Password must be at least 8 characters long.",
    });
  }

  const redisKey = `parent_invite:${token}`;
  const parentId = await redis.get(redisKey);

  if (!parentId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invite link is invalid or has expired.",
    });
  }

  // Delete invite token immediately
  await redis.del(redisKey);
  await redis.del(`parent_token_lookup:${parentId}`);

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: parentId },
      data: {
        hashedPassword,
        isActive: true,
      },
    });

    await writeAuditLog(
      {
        userId: parentId,
        action: AUDIT_ACTIONS.PARENT_INVITE_ACCEPTED,
        entity: "User",
        entityId: parentId,
        metadata: { email: user.email },
        isSensitive: false,
      },
      tx,
    );

    return user;
  });

  return { success: true, email: updatedUser.email };
}
