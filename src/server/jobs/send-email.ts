// src/server/jobs/send-email.ts
// Resend Email BullMQ job handler
// Locked per Rule NOTIF-1, NOTIF-2, and PRD §6.5

import { Job, Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/server/db/prisma";
import { config } from "@/lib/config";
import { Resend } from "resend";
import { createBursarNotificationAlert } from "@/server/services/notifications/bursar-alerts";

export interface SendEmailJobData {
  notificationId: string;
  studentId: string;
  studentName?: string;
  to: string;
  subject: string;
  body: string;
}

const resend = new Resend(config.resend.apiKey);

export async function processSendEmail(job: Job<SendEmailJobData>) {
  const { notificationId, to, subject, body } = job.data;

  try {
    const result = await resend.emails.send({
      from: config.resend.fromEmail,
      to,
      subject,
      text: body,
    });

    if (result.error) {
      throw new Error(`Resend error: ${result.error.message}`);
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Email send attempt ${job.attemptsMade + 1} failed:`, error);
    throw error; // Re-throw to trigger BullMQ retry
  }
}

export const emailWorker = new Worker(
  "notifications",
  async (job) => {
    if (job.name === "send-email") {
      await processSendEmail(job as Job<SendEmailJobData>);
    }
  },
  {
    connection: redis,
    concurrency: 5,
  },
);

emailWorker.on("failed", async (job, error) => {
  const isFinalFailure = job && job.attemptsMade >= (job.opts.attempts ?? 3);

  if (isFinalFailure && job?.data) {
    const data = job.data as SendEmailJobData;

    await prisma.notification.update({
      where: { id: data.notificationId },
      data: { status: "FAILED" },
    });

    // Check if fallback SMS channel is available
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      include: { parentLinks: { include: { parent: true } } },
    });

    const hasSmsFallback = Boolean(student?.parentLinks[0]?.parent?.phone);

    if (!hasSmsFallback) {
      await createBursarNotificationAlert({
        studentId: data.studentId,
        studentName: data.studentName || `${student?.firstName} ${student?.lastName}`,
        notificationType: "Email payment notification",
      });
    }
  }
});
