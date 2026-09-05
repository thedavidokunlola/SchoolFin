// src/server/services/notifications/bursar-alerts.ts
// In-app Bursar alerts on notification failure
// Locked per Rule NOTIF-2 and PRD §K1-AC9

import { prisma } from "@/server/db/prisma";

export async function createBursarNotificationAlert(params: {
  studentId: string;
  studentName: string;
  notificationType: string;
}) {
  const alertMessage = `[ALERT] ${params.studentName}'s parent could not be reached — ${params.notificationType} delivery failed. No fallback channel is available. Please contact the parent directly.`;

  // Find system user or bursar user to record the alert note
  const systemUser = await prisma.user.findFirst({
    where: { role: { in: ["BURSAR", "PROPRIETOR"] } },
  });

  if (systemUser) {
    await prisma.studentNote.create({
      data: {
        studentId: params.studentId,
        authorId: systemUser.id,
        content: alertMessage,
      },
    });
  }
}

export async function getActiveBursarAlerts() {
  return prisma.studentNote.findMany({
    where: {
      content: { startsWith: "[ALERT]" },
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          class: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
