// src/lib/config.ts
// Validated environment variables (single read point)
// Locked per coding-standards.md and configuration-and-deployment.md

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    console.error(`WARNING: Environment variable "${key}" is not set and has no fallback.`);
    return "";
  }
  return value;
}

export const config = {
  database: {
    url:
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL ||
      "",
  },
  redis: {
    url: getEnv("REDIS_URL", "redis://127.0.0.1:6379"),
  },
  auth: {
    secret: getEnv("NEXTAUTH_SECRET", "schoolfin-demo-nextauth-secret-key-32chars"),
    url:
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  },
  encryption: {
    key: getEnv("ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef"),
  },
  flutterwave: {
    publicKey: getEnv("FLUTTERWAVE_PUBLIC_KEY", "FLWPUBK_TEST-demo"),
    secretKey: getEnv("FLUTTERWAVE_SECRET_KEY", "FLWSECK_TEST-demo"),
    secretHash: getEnv("FLUTTERWAVE_SECRET_HASH", "schoolfin_demo_hash"),
  },
  termii: {
    apiKey: getEnv("TERMII_API_KEY", "demo_termii_key"),
    senderId: getEnv("TERMII_SENDER_ID", "SchoolFin"),
  },
  resend: {
    apiKey: getEnv("RESEND_API_KEY", "re_demo_key"),
    fromEmail: getEnv("RESEND_FROM_EMAIL", "fees@schoolfin.ng"),
    domain: getEnv("RESEND_DOMAIN", "schoolfin.ng"),
  },
  proprietorEmail: getEnv("PROPRIETOR_EMAIL", "proprietor@princeofpeaceschool.com"),
  isProduction: process.env.NODE_ENV === "production",
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;
