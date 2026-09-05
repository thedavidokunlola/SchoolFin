// src/server/services/notifications/send-payment-confirmation.ts
// Pipeline for dispatching payment confirmation notifications
// Follows notification-enqueue skill

import { prisma } from "@/server/db/prisma";
import { notificationsQueue } from "@/server/jobs/queues";
import { checkSmsCapBeforeSend } from "./sms-cap";
import {
  renderPaymentConfirmationEmail,
  renderPaymentConfirmationSms,
} from "./render-template";

export interface SendPaymentConfirmationParams {
  studentId: string;
  studentFirstName: string;
  parentEmail?: string | null;
  parentPhone?: string | null;
  amount: string | number;
  receiptNumber: string;
}

export async function sendPaymentConfirmation(params: SendPaymentConfirmationParams) {
  const { studentId, studentFirstName, parentEmail, parentPhone, amount, receiptNumber } = params;

  // 1. Email path
  if (parentEmail) {
    const emailData = renderPaymentConfirmationEmail({
      studentFirstName,
      amount,
      receiptNumber,
    });

    const emailNotification = await prisma.notification.create({
      data: {
        studentId,
        channel: "EMAIL",
        type: "PAYMENT_CONFIRMATION",
        subject: emailData.subject,
        body: emailData.body,
        status: "QUEUED",
      },
    });

    await notificationsQueue.add(
      "send-email",
      {
        notificationId: emailNotification.id,
        studentId,
        studentName: studentFirstName,
        to: parentEmail,
        subject: emailData.subject,
        body: emailData.body,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 60 * 1000 },
      },
    );
  }

  // 2. SMS path (with cap check per NOTIF-3)
  if (parentPhone) {
    const capStatus = await checkSmsCapBeforeSend();

    if (capStatus !== "HARD_LIMIT_REACHED") {
      const smsBody = renderPaymentConfirmationSms({
        studentFirstName,
        amount,
        receiptNumber,
      });

      const smsNotification = await prisma.notification.create({
        data: {
          studentId,
          channel: "SMS",
          type: "PAYMENT_CONFIRMATION",
          body: smsBody,
          status: "QUEUED",
        },
      });

      await notificationsQueue.add(
        "send-sms",
        {
          notificationId: smsNotification.id,
          studentId,
          studentName: studentFirstName,
          to: parentPhone,
          body: smsBody,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 60 * 1000 },
        },
      );
    }
  }
}
