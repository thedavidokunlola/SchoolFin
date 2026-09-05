// src/server/services/notifications/sms-cap.ts
// SMS Monthly Cap enforcement per Rule NOTIF-3 and PRD §7.2

import { prisma } from "@/server/db/prisma";
import { schoolConfig } from "@/../../school.config";

export type SmsCapStatus = "NORMAL" | "WARNING_THRESHOLD_REACHED" | "HARD_LIMIT_REACHED";

export async function checkSmsCapBeforeSend(): Promise<SmsCapStatus> {
  const cap = schoolConfig.smsMonthlyCapSmsUnits || 1000;

  // Calculate SMS sent in current calendar month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const sentCount = await prisma.notification.count({
    where: {
      channel: "SMS",
      status: { in: ["QUEUED", "SENT"] },
      sentAt: { gte: startOfMonth },
    },
  });

  const usageRatio = sentCount / cap;

  if (usageRatio >= 1.0) {
    return "HARD_LIMIT_REACHED";
  }

  if (usageRatio >= 0.8) {
    return "WARNING_THRESHOLD_REACHED";
  }

  return "NORMAL";
}

export async function getSmsUsageStats(): Promise<{
  cap: number;
  sentCount: number;
  usageRatio: number;
  isPaused: boolean;
}> {
  const cap = schoolConfig.smsMonthlyCapSmsUnits || 1000;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const sentCount = await prisma.notification.count({
    where: {
      channel: "SMS",
      status: { in: ["QUEUED", "SENT"] },
      sentAt: { gte: startOfMonth },
    },
  });

  return {
    cap,
    sentCount,
    usageRatio: sentCount / cap,
    isPaused: sentCount >= cap,
  };
}
