// src/server/services/debt-collection/index.ts
// Debt Collection Rules, Communication Templates, and Pause Manager
// Locked per Module G1, G2, G3, and Rule NOTIF-4/5/6

import { TRPCError } from "@trpc/server";
import { prisma } from "@/server/db/prisma";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import type { DebtStage, NotificationChannel } from "@prisma/client";

export interface CreateDebtRuleInput {
  termId: string;
  stage: DebtStage;
  daysOverdue: number;
  templateId: string;
  createdById: string;
}

export async function createDebtCollectionRule(input: CreateDebtRuleInput) {
  const existing = await prisma.debtCollectionRule.findUnique({
    where: {
      termId_stage: {
        termId: input.termId,
        stage: input.stage,
      },
    },
  });

  if (existing) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `A rule for stage ${input.stage} already exists for this term.`,
    });
  }

  const rule = await prisma.debtCollectionRule.create({
    data: {
      termId: input.termId,
      stage: input.stage,
      daysOverdue: input.daysOverdue,
      templateId: input.templateId,
      isActive: true,
    },
    include: {
      template: true,
      term: true,
    },
  });

  await writeAuditLog({
    userId: input.createdById,
    action: AUDIT_ACTIONS.DEBT_COLLECTION_RULE_CREATED,
    entity: "DebtCollectionRule",
    entityId: rule.id,
    metadata: {
      termId: input.termId,
      stage: input.stage,
      daysOverdue: input.daysOverdue,
    },
  });

  return rule;
}

export async function getDebtCollectionRules(termId?: string) {
  return prisma.debtCollectionRule.findMany({
    where: {
      isActive: true,
      ...(termId ? { termId } : {}),
    },
    include: {
      template: true,
      term: true,
    },
    orderBy: { daysOverdue: "asc" },
  });
}

export interface CreateCommunicationTemplateInput {
  name: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  variables: string[];
  createdById: string;
}

export async function createCommunicationTemplate(input: CreateCommunicationTemplateInput) {
  const template = await prisma.communicationTemplate.create({
    data: {
      name: input.name,
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      variables: input.variables,
      isActive: true,
    },
  });

  await writeAuditLog({
    userId: input.createdById,
    action: AUDIT_ACTIONS.COMMUNICATION_TEMPLATE_CREATED,
    entity: "CommunicationTemplate",
    entityId: template.id,
    metadata: { name: template.name, channel: template.channel },
  });

  return template;
}

export async function getCommunicationTemplates() {
  return prisma.communicationTemplate.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export interface ToggleStudentPauseInput {
  studentId: string;
  isPaused: boolean;
  updatedById: string;
}

export async function toggleStudentMessagePause(input: ToggleStudentPauseInput) {
  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
  });

  if (!student) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
  }

  // Update installments isPaused flag and record pause note
  await prisma.$transaction(async (tx) => {
    await tx.installment.updateMany({
      where: { studentId: input.studentId },
      data: { isPaused: input.isPaused },
    });

    if (input.isPaused) {
      await tx.studentNote.create({
        data: {
          studentId: input.studentId,
          authorId: input.updatedById,
          content: "[PAUSED] Automated debt collection messages paused by bursar.",
        },
      });
    } else {
      await tx.studentNote.create({
        data: {
          studentId: input.studentId,
          authorId: input.updatedById,
          content: "[RESUMED] Automated debt collection messages resumed by bursar.",
        },
      });
    }

    await writeAuditLog(
      {
        userId: input.updatedById,
        action: input.isPaused
          ? AUDIT_ACTIONS.AUTOMATED_MESSAGES_PAUSED
          : AUDIT_ACTIONS.AUTOMATED_MESSAGES_RESUMED,
        entity: "Student",
        entityId: student.id,
        metadata: {
          isPaused: input.isPaused,
          studentName: `${student.firstName} ${student.lastName}`,
        },
      },
      tx,
    );
  });

  return { studentId: student.id, isPaused: input.isPaused };
}

export async function getDebtCollectionEvents(params: {
  studentId?: string;
  limit?: number;
}) {
  return prisma.debtCollectionEvent.findMany({
    where: {
      ...(params.studentId ? { studentId: params.studentId } : {}),
    },
    include: {
      student: true,
      rule: {
        include: { template: true },
      },
    },
    orderBy: { sentAt: "desc" },
    take: params.limit || 50,
  });
}
