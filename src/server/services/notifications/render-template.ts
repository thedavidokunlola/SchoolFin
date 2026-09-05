// src/server/services/notifications/render-template.ts
// Template rendering for emails and SMS notifications

import { schoolConfig } from "@/../../school.config";

export interface TemplateContext {
  studentFirstName?: string;
  studentLastName?: string;
  amount?: string | number;
  receiptNumber?: string;
  termName?: string;
  dueDate?: string;
  paymentLink?: string;
  installmentNumber?: number;
  retryDate?: string;
  schoolName?: string;
  schoolPhone?: string;
}

export function renderPaymentConfirmationEmail(ctx: TemplateContext): {
  subject: string;
  body: string;
} {
  const schoolName = ctx.schoolName || schoolConfig.name;
  const subject = `Payment Confirmation - ${schoolName} (Receipt: ${ctx.receiptNumber})`;

  const body = `
Dear Parent/Guardian,

We have successfully received and verified your payment of ₦${Number(ctx.amount).toLocaleString()} for ${ctx.studentFirstName}.

Receipt Number: ${ctx.receiptNumber}
School: ${schoolName}

You can view and download your official receipt online at:
${ctx.paymentLink || "https://portal.greenwoodacademy.ng"}

Thank you,
Bursary Office
${schoolName}
${schoolConfig.phone}
`.trim();

  return { subject, body };
}

export function renderPaymentConfirmationSms(ctx: TemplateContext): string {
  const schoolName = ctx.schoolName || schoolConfig.name;
  return `${schoolName}: Payment of NGN${Number(ctx.amount).toLocaleString()} received for ${ctx.studentFirstName}. Receipt: ${ctx.receiptNumber}. Thank you!`.trim();
}

export function renderInstallmentPreRetryAlert(ctx: TemplateContext): {
  subject: string;
  body: string;
} {
  const schoolName = ctx.schoolName || schoolConfig.name;
  const subject = `Upcoming Fee Installment Retry - ${schoolName}`;

  const body = `
Dear Parent/Guardian,

This is a reminder that an automatic charge of ₦${Number(ctx.amount).toLocaleString()} for ${ctx.studentFirstName}'s school fee installment will be retried in 24 hours.

Please ensure sufficient funds are available on your registered card to avoid disruption.

Bursary Department
${schoolName}
`.trim();

  return { subject, body };
}

export function renderMessageTemplate(
  templateBody: string,
  variables: Record<string, string | number>,
): string {
  let rendered = templateBody;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    rendered = rendered.replace(regex, String(value));
  }
  return rendered;
}
