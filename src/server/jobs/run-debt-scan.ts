// src/server/jobs/run-debt-scan.ts
// Automated Debt Collection Scan Cron (08:00 WAT Mon–Fri)
// Locked per Module G, Rule NOTIF-4, NOTIF-5, NOTIF-6, NOTIF-3, and PRD §6.5

import { Job, Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/server/db/prisma";
import { computeBatchOutstandingBalances } from "@/server/services/balance";
import { checkSmsCapBeforeSend } from "@/server/services/notifications/sms-cap";
import { notificationsQueue } from "./queues";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { renderMessageTemplate } from "@/server/services/notifications/render-template";
import { schoolConfig } from "@/../../school.config";
import { format } from "date-fns";

export async function handleRunDebtScan() {
  const activeTerm = await prisma.academicTerm.findFirst({
    where: { isActive: true },
  });

  if (!activeTerm) {
    return;
  }

  // Rule NOTIF-4: If paymentDueDate is not set on active term, log warning and skip
  if (!activeTerm.paymentDueDate) {
    console.warn(
      `[DEBT-SCAN] paymentDueDate is null for active term ${activeTerm.name}. Skipping automated debt scan.`,
    );
    await writeAuditLog({
      userId: "system",
      action: AUDIT_ACTIONS.DEBT_SCAN_FAILED,
      entity: "AcademicTerm",
      entityId: activeTerm.id,
      metadata: { reason: "paymentDueDate is not configured on active term" },
    });
    return;
  }

  const now = new Date();
  const paymentDueDate = activeTerm.paymentDueDate;

  // Calculate days difference relative to paymentDueDate (positive = overdue, negative = before due date)
  const diffTime = now.getTime() - paymentDueDate.getTime();
  const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Fetch active debt collection rules for active term
  const activeRules = await prisma.debtCollectionRule.findMany({
    where: {
      isActive: true,
      termId: activeTerm.id,
    },
    include: { template: true },
    orderBy: { daysOverdue: "asc" },
  });

  if (activeRules.length === 0) {
    return;
  }

  // Fetch active students and parent contacts
  const students = await prisma.student.findMany({
    where: { isActive: true },
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
  });

  const studentIds = students.map((s) => s.id);
  const balanceMap = await computeBatchOutstandingBalances(studentIds, activeTerm.id);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const student of students) {
    // Rule NOTIF-6: Respect the isPaused flag on student accounts
    const isPaused = student.installments.length > 0 || student.notes.length > 0;
    if (isPaused) {
      continue;
    }

    const balance = balanceMap.get(student.id);
    if (!balance || balance.lte(0)) {
      continue;
    }

    const parent = student.parentLinks[0]?.parent;
    if (!parent) {
      continue;
    }

    // Evaluate matching rules based on daysOverdue
    for (const rule of activeRules) {
      // Rule matches if daysDiff is at or past daysOverdue
      if (daysDiff < rule.daysOverdue) {
        continue;
      }

      // Rule NOTIF-5: Deduplicate debt collection messages by ruleId within the past 7 days (NOT by stage enum)
      const recentEvent = await prisma.debtCollectionEvent.findFirst({
        where: {
          studentId: student.id,
          ruleId: rule.id,
          sentAt: { gte: sevenDaysAgo },
        },
      });

      if (recentEvent) {
        continue;
      }

      // Render message template with dynamic placeholders
      const renderedBody = renderMessageTemplate(rule.template.body, {
        student_name: `${student.firstName} ${student.lastName}`,
        amount_due: balance.toFixed(2),
        due_date: format(paymentDueDate, "dd/MM/yyyy"),
        payment_link: `https://${schoolConfig.domain}/parent/pay/${student.id}`,
      });

      const channel = rule.template.channel;

      // Rule NOTIF-3: Check SMS monthly cap before sending SMS
      if (channel === "SMS") {
        const smsStatus = await checkSmsCapBeforeSend();
        if (smsStatus === "HARD_LIMIT_REACHED") {
          console.warn(`[DEBT-SCAN] SMS cap reached (100%). Skipping SMS for student ${student.id}.`);
          continue;
        }

        if (parent.phone) {
          await notificationsQueue.add("send-sms", {
            to: parent.phone,
            message: renderedBody,
            studentId: student.id,
          });

          // Record DebtCollectionEvent with ruleId (PRD §FIX-8 / Module G)
          await prisma.debtCollectionEvent.create({
            data: {
              studentId: student.id,
              ruleId: rule.id,
              stage: rule.stage,
              channel: "SMS",
              message: renderedBody,
              status: "QUEUED",
            },
          });
        }
      } else if (channel === "EMAIL") {
        if (parent.email) {
          await notificationsQueue.add("send-email", {
            to: parent.email,
            subject: rule.template.subject || `School Fees Notice - ${student.firstName} ${student.lastName}`,
            html: `<p>${renderedBody.replace(/\n/g, "<br/>")}</p>`,
            studentId: student.id,
          });

          await prisma.debtCollectionEvent.create({
            data: {
              studentId: student.id,
              ruleId: rule.id,
              stage: rule.stage,
              channel: "EMAIL",
              message: renderedBody,
              status: "QUEUED",
            },
          });
        }
      }
    }
  }
}

export const debtScanWorker = new Worker(
  "debt-collection",
  async (job: Job) => {
    if (job.name === "run-debt-scan") {
      await handleRunDebtScan();
    }
  },
  {
    connection: redis,
    concurrency: 1,
  },
);
