// src/lib/audit.ts
// Single authoritative entry point for AuditLog writes
// Locked per folder-structure.md Boundary 3, audit-log.md, and audit-log-entry skill

import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";
import { SENSITIVE_AUDIT_ACTIONS, type AuditAction } from "@/lib/constants";

export interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  isSensitive?: boolean;
  createdAt?: Date;
}

export async function writeAuditLog(
  entry: AuditLogEntry,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const db = tx ?? prisma;
  const isSensitive =
    entry.isSensitive ?? SENSITIVE_AUDIT_ACTIONS.has(entry.action);

  await db.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      metadata: entry.metadata ? (entry.metadata as Prisma.InputJsonValue) : undefined,
      isSensitive,
      ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
    },
  });
}
