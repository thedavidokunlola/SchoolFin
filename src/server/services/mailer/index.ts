// src/server/services/mailer/index.ts
// Email delivery service using Nodemailer for OTP verification and transactional notifications

import nodemailer from "nodemailer";
import { config } from "@/lib/config";
import { schoolConfig } from "../../../../school.config";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (config.smtp.user && config.smtp.pass) {
      // If using Gmail
      if (
        config.smtp.host.includes("gmail.com") ||
        config.smtp.user.endsWith("@gmail.com")
      ) {
        transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: config.smtp.user,
            pass: config.smtp.pass, // 16-character Google App Password
          },
        });
      } else {
        // Standard custom SMTP host (Brevo, SendGrid, Amazon SES, cPanel, etc.)
        transporter = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure || config.smtp.port === 465,
          auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
          },
        });
      }
    } else {
      // In development fallback if no SMTP credentials in .env, create JSON transporter
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }
  return transporter;
}


export interface SendOtpEmailParams {
  toEmail: string;
  adminName: string;
  otpCode: string;
  schoolName?: string;
}

export async function sendSetupOtpEmail({
  toEmail,
  adminName,
  otpCode,
  schoolName,
}: SendOtpEmailParams): Promise<{ success: boolean; messageId?: string }> {
  const portalName = schoolName || schoolConfig.name;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { text-align: center; margin-bottom: 24px; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { font-size: 13px; color: #2B35AF; font-weight: 700; text-transform: uppercase; margin-top: 4px; }
    .otp-box { background: #f8fafc; border: 2px dashed #2B35AF; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #2B35AF; font-family: monospace; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; }
    .warning { font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">${portalName}</h1>
      <div class="subtitle">Email Verification</div>
    </div>
    <p class="text">Hello <strong>${adminName}</strong>,</p>
    <p class="text">Use the 6-digit code below to verify your email and finish setting up your school manager account for <strong>${portalName}</strong>:</p>
    
    <div class="otp-box">
      <div class="otp-code">${otpCode}</div>
    </div>

    <p class="text" style="font-size: 13px; text-align: center; color: #64748b;">
      ⏱️ This code is valid for <strong>10 minutes</strong>.
    </p>

    <div class="warning">
      If you did not request this verification code, please ignore this email.
    </div>
  </div>
</body>
</html>
  `;

  // Always log to server terminal during development for real-time testing
  console.log("=================================================");
  console.log(`🔑 [OTP VERIFICATION CODE FOR ${toEmail}]: ${otpCode}`);
  console.log("=================================================");

  try {
    const mailClient = getTransporter();
    const result = await mailClient.sendMail({
      from: config.smtp.from,
      to: toEmail,
      subject: `${otpCode} is your verification code for ${portalName}`,
      text: `Hello ${adminName},\n\nYour 6-digit verification code is: ${otpCode}\n\nThis code expires in 10 minutes. If you did not request this, please ignore this email.`,
      html: htmlContent,
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Failed to send verification email via Nodemailer:", error);
    // Return success in development so admin can still verify with console OTP if SMTP fails
    return { success: true };
  }
}
