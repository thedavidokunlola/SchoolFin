// src/server/jobs/send-sms.ts
// Termii SMS BullMQ job handler
// Locked per Rule NOTIF-1, NOTIF-2, and PRD §6.5

import { Job, Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/server/db/prisma";
import { config } from "@/lib/config";
import { createBursarNotificationAlert } from "@/server/services/notifications/bursar-alerts";

export interface SendSmsJobData {
  notificationId: string;
  studentId: string;
  studentName?: string;
  to: string;
  body: string;
}

export async function processSendSms(job: Job<SendSmsJobData>) {
  const { notificationId, to, body } = job.data;

  // Format Nigerian phone number to international format (234...)
  let formattedPhone = to.replace(/\s+/g, "").replace(/-/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = `234${formattedPhone.substring(1)}`;
  } else if (formattedPhone.startsWith("+")) {
    formattedPhone = formattedPhone.substring(1);
  }

  const payload = {
    to: formattedPhone,
    from: config.termii.senderId,
    sms: body,
    type: "plain",
    channel: "generic",
    api_key: config.termii.apiKey,
  };

  try {
    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && (data.code === "ok" || data.message === "Successfully Sent")) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });
    } else {
      throw new Error(`Termii API error: ${data.message || response.statusText}`);
    }
  } catch (error) {
    console.error(`SMS send attempt ${job.attemptsMade + 1} failed:`, error);
    throw error; // Re-throw to trigger BullMQ retry
  }
}

export const smsWorker = new Worker(
  "notifications",
  async (job) => {
    if (job.name === "send-sms") {
      await processSendSms(job as Job<SendSmsJobData>);
    }
  },
  {
    connection: redis,
    concurrency: 5,
  },
);

smsWorker.on("failed", async (job, error) => {
  const isFinalFailure = job && job.attemptsMade >= (job.opts.attempts ?? 3);

  if (isFinalFailure && job?.data) {
    const data = job.data as SendSmsJobData;

    await prisma.notification.update({
      where: { id: data.notificationId },
      data: { status: "FAILED" },
    });

    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      include: { parentLinks: { include: { parent: true } } },
    });

    const hasEmailFallback = Boolean(student?.parentLinks[0]?.parent?.email);

    if (!hasEmailFallback) {
      await createBursarNotificationAlert({
        studentId: data.studentId,
        studentName: data.studentName || `${student?.firstName} ${student?.lastName}`,
        notificationType: "SMS payment notification",
      });
    }
  }
});
