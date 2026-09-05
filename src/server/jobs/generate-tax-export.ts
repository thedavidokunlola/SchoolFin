// src/server/jobs/generate-tax-export.ts
// BullMQ worker for asynchronous tax audit Excel generation on timeout fallback
// Locked per PRD §6.5, Module I2, and excel-export skill

import { Job, Worker } from "bullmq";
import { redis } from "@/lib/redis";
import { buildTaxAuditWorkbook } from "@/server/services/reports/tax-audit-export";
import { notificationsQueue } from "./queues";
import { writeAuditLog } from "@/lib/audit";

export interface GenerateTaxExportJobData {
  termId?: string;
  requestingUserId: string;
  requestingUserEmail: string;
}

export async function processGenerateTaxExport(job: Job<GenerateTaxExportJobData>) {
  const { termId, requestingUserId, requestingUserEmail } = job.data;

  try {
    const { buffer, fileName } = await buildTaxAuditWorkbook(termId);

    // Queue email to requesting user with the report
    await notificationsQueue.add("send-email", {
      to: requestingUserEmail,
      subject: `Your Financial Tax Report is Ready: ${fileName}`,
      html: `
        <p>Dear Administrator,</p>
        <p>Your requested financial and tax audit report (<strong>${fileName}</strong>) has been generated successfully.</p>
        <p>Please log in to the SchoolFin portal to access and review your complete financial statements.</p>
      `,
    });

    await writeAuditLog({
      userId: requestingUserId,
      action: "TAX_EXPORT_ASYNC_COMPLETED",
      entity: "Report",
      entityId: fileName,
      metadata: { requestingUserEmail, fileName },
    });
  } catch (error) {
    console.error(`Failed async tax audit export for user ${requestingUserEmail}:`, error);

    // Email user with error message (PRD §6.5)
    await notificationsQueue.add("send-email", {
      to: requestingUserEmail,
      subject: "Tax Audit Report Generation Failed",
      html: `
        <p>Dear Administrator,</p>
        <p>We encountered an unexpected error while preparing your requested tax audit report. Please try generating it again or contact system support.</p>
      `,
    });
  }
}

export const taxExportWorker = new Worker(
  "reports",
  async (job: Job) => {
    if (job.name === "generate-tax-export") {
      await processGenerateTaxExport(job as Job<GenerateTaxExportJobData>);
    }
  },
  {
    connection: redis,
    concurrency: 1,
  },
);
