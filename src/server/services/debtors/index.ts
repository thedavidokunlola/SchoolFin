// src/server/services/debtors/index.ts
// Debtor List query engine & bulk manual reminder service
// Locked per Module H1, Rule PERF-1, and notification-enqueue skill

import { prisma } from "@/server/db/prisma";
import { computeBatchOutstandingBalances } from "@/server/services/balance";
import { notificationsQueue } from "@/server/jobs/queues";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { checkSmsCapBeforeSend } from "@/server/services/notifications/sms-cap";
import { Decimal } from "@prisma/client/runtime/library";
import { schoolConfig } from "@/../../school.config";

export interface DebtorFilterParams {
  termId?: string;
  class?: string;
  search?: string;
  minAmount?: number;
  minOverdueDays?: number;
  limit?: number;
  offset?: number;
}

export async function getDebtorsList(params: DebtorFilterParams = {}) {
  const term = params.termId
    ? await prisma.academicTerm.findUnique({ where: { id: params.termId } })
    : await prisma.academicTerm.findFirst({ where: { isActive: true } });

  if (!term) {
    return {
      termName: "No Active Term",
      totalDebtors: 0,
      totalOutstanding: "0.00",
      debtors: [],
    };
  }

  // 1. Fetch active students matching search & class filter
  const students = await prisma.student.findMany({
    where: {
      isActive: true,
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
    },
    include: {
      parentLinks: {
        where: { isActive: true },
        include: { parent: true },
      },
      installments: {
        where: { isPaused: true },
      },
      notes: {
        where: { content: { startsWith: "[PAUSED]" } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ class: "asc" }, { lastName: "asc" }],
  });

  // 2. Batch calculate balances
  const studentIds = students.map((s) => s.id);
  const balanceMap = await computeBatchOutstandingBalances(studentIds, term.id);

  // 3. Calculate overdue days relative to term due date
  const now = new Date();
  const dueDate = term.paymentDueDate || term.startDate;
  const isOverdue = now > dueDate;
  const diffTime = Math.abs(now.getTime() - dueDate.getTime());
  const calculatedOverdueDays = isOverdue ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

  // 4. Filter only students with positive balance and applying amount/overdue thresholds
  let totalOutstanding = new Decimal(0);

  const filteredDebtors = students
    .map((student) => {
      const balance = balanceMap.get(student.id) || new Decimal(0);
      const parent = student.parentLinks[0]?.parent;
      const isPaused = student.installments.length > 0 || student.notes.length > 0;

      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        class: student.class,
        isPaused,
        creditBalance: student.creditBalance.toString(),
        outstandingBalance: balance.toString(),
        balanceDecimal: balance,
        overdueDays: calculatedOverdueDays,
        parent: parent
          ? {
              id: parent.id,
              name: `${parent.firstName} ${parent.lastName}`,
              email: parent.email,
              phone: parent.phone,
            }
          : null,
      };
    })
    .filter((d) => {
      if (d.balanceDecimal.lte(0)) return false;
      if (params.minAmount && d.balanceDecimal.lt(params.minAmount)) return false;
      if (params.minOverdueDays && d.overdueDays < params.minOverdueDays) return false;

      totalOutstanding = totalOutstanding.add(d.balanceDecimal);
      return true;
    });

  // 5. Apply pagination for performance (< 2s per Rule PERF-1)
  const offset = params.offset || 0;
  const limit = params.limit || 100;
  const paginated = filteredDebtors.slice(offset, offset + limit);

  return {
    termName: term.name,
    totalDebtors: filteredDebtors.length,
    totalOutstanding: totalOutstanding.toString(),
    debtors: paginated.map(({ balanceDecimal, ...rest }) => rest),
  };
}

export interface SendBulkRemindersInput {
  studentIds: string[];
  channel: "EMAIL" | "SMS" | "BOTH";
  customMessage?: string;
  senderId: string;
}

export async function sendBulkManualReminders(input: SendBulkRemindersInput) {
  const activeTerm = await prisma.academicTerm.findFirst({ where: { isActive: true } });
  if (!activeTerm) {
    throw new Error("No active academic term configured");
  }

  const students = await prisma.student.findMany({
    where: { id: { in: input.studentIds } },
    include: {
      parentLinks: {
        where: { isActive: true },
        include: { parent: true },
      },
    },
  });

  const balanceMap = await computeBatchOutstandingBalances(input.studentIds, activeTerm.id);
  let queuedCount = 0;

  for (const student of students) {
    const balance = balanceMap.get(student.id);
    if (!balance || balance.lte(0)) continue;

    const parent = student.parentLinks[0]?.parent;
    if (!parent) continue;

    const defaultMsg = `Dear Parent, please be reminded that ${student.firstName} ${student.lastName} has an outstanding school fee balance of ₦${balance.toFixed(2)} for ${activeTerm.name}. Kindly visit https://${schoolConfig.domain}/parent/pay/${student.id} to make payment. Thank you.`;
    const message = input.customMessage || defaultMsg;

    // Send Email
    if ((input.channel === "EMAIL" || input.channel === "BOTH") && parent.email) {
      await notificationsQueue.add("send-email", {
        to: parent.email,
        subject: `School Fee Reminder - ${student.firstName} ${student.lastName}`,
        html: `<p>${message.replace(/\n/g, "<br/>")}</p>`,
        studentId: student.id,
      });
      queuedCount++;
    }

    // Send SMS
    if ((input.channel === "SMS" || input.channel === "BOTH") && parent.phone) {
      const smsStatus = await checkSmsCapBeforeSend();
      if (smsStatus !== "HARD_LIMIT_REACHED") {
        await notificationsQueue.add("send-sms", {
          to: parent.phone,
          message,
          studentId: student.id,
        });
        queuedCount++;
      }
    }
  }

  await writeAuditLog({
    userId: input.senderId,
    action: AUDIT_ACTIONS.BULK_REMINDER_SENT,
    entity: "Notification",
    entityId: `bulk-${Date.now()}`,
    metadata: {
      studentCount: input.studentIds.length,
      queuedNotifications: queuedCount,
      channel: input.channel,
    },
  });

  return { queuedCount, totalStudents: input.studentIds.length };
}
