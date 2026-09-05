// src/lib/config.ts
// Validated environment variables (single read point)
// Locked per coding-standards.md and configuration-and-deployment.md

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`FATAL: Required environment variable "${key}" is not set.`);
    if (typeof process !== "undefined" && typeof process.exit === "function") {
      process.exit(1);
    }
    throw new Error(`FATAL: Required environment variable "${key}" is not set.`);
  }
  return value;
}

export const config = {
  database: {
    url: requireEnv("DATABASE_URL"),
  },
  redis: {
    url: requireEnv("REDIS_URL"),
  },
  auth: {
    secret: requireEnv("NEXTAUTH_SECRET"),
    url: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  },
  encryption: {
    key: requireEnv("ENCRYPTION_KEY"),
  },
  flutterwave: {
    publicKey: requireEnv("FLUTTERWAVE_PUBLIC_KEY"),
    secretKey: requireEnv("FLUTTERWAVE_SECRET_KEY"),
    secretHash: requireEnv("FLUTTERWAVE_SECRET_HASH"),
  },
  termii: {
    apiKey: requireEnv("TERMII_API_KEY"),
    senderId: requireEnv("TERMII_SENDER_ID"),
  },
  resend: {
    apiKey: requireEnv("RESEND_API_KEY"),
    fromEmail: requireEnv("RESEND_FROM_EMAIL"),
    domain: requireEnv("RESEND_DOMAIN"),
  },
  proprietorEmail: requireEnv("PROPRIETOR_EMAIL"),
  isProduction: process.env.NODE_ENV === "production",
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;
