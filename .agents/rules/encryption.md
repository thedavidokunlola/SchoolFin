---
trigger: glob
globs:
  - "src/server/services/encryption/**"
  - "src/lib/encryption/**"
---

# encryption.md

> 🔴 All rules here are hard requirements from PRD §6.6 and §J2.  
> A feature that stores unencrypted PII or an unencrypted card token is a failed task.

---

## Rule 1 — AES-256 for PII Columns

🔴 **The following columns are encrypted at the application layer using AES-256 before any Prisma write:**

| Model | Field |
|---|---|
| `User` | `phone` |
| `User` | `email` |

🔴 **The encryption key is stored in environment variables only (`ENCRYPTION_KEY`).**  
It is never stored in the database, in source code, in a log, or in any Sentry metadata payload.

🔴 **The encryption and decryption functions live exclusively in `src/server/services/encryption/`.**  
No other file implements encryption logic inline.

```typescript
// src/server/services/encryption/index.ts
import crypto from "crypto";
import { config } from "@/lib/config";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(config.encryption.key, "hex"); // 32 bytes = 64 hex chars

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
```

---

## Rule 2 — AES-256 for Card Tokens

🔴 **`Installment.cardToken` stores the Flutterwave card token encrypted with AES-256 before write.**  
The raw token is never written to the database. The raw token is never logged. The raw token is never included in any API response.

```typescript
// Before writing to Installment.cardToken
const encryptedToken = encrypt(rawCardToken);
await prisma.installment.update({
  where: { id: installmentId },
  data: { cardToken: encryptedToken },
});

// Before using for auto-charge
const encryptedToken = installment.cardToken;
if (!encryptedToken) return null;
const rawToken = decrypt(encryptedToken);
// Pass rawToken to PaymentGateway.chargeToken() — never log it
```

🔴 **SchoolFin never stores actual card numbers, CVVs, or expiry dates.**  
Flutterwave's infrastructure handles card data. SchoolFin only stores the opaque token returned by Flutterwave after tokenisation.

---

## Rule 3 — Transport Security

🔴 **TLS 1.2 is the minimum version on all connections.**  
🔴 **All routes are served over HTTPS. HTTP requests are permanently redirected to HTTPS.**  
🔴 **No route in any environment (staging, production) serves over plain HTTP.**  
Exception: `localhost` in local development only.

---

## Rule 4 — Receipt File URLs

🔴 **Receipt PDFs stored in Cloudinary or S3 are served via signed URLs with a 1-hour expiry.**  
Never expose a permanent public URL for a receipt file. The signed URL is generated on demand when the parent or bursar requests the download link.

---

## Rule 5 — No Secrets in the Repository

🔴 **`.env` is listed in `.gitignore` before the first commit.**  
Every secret lives in `.env` only. This includes:
- `ENCRYPTION_KEY`
- `FLUTTERWAVE_SECRET_KEY`
- `FLUTTERWAVE_SECRET_HASH`
- `TERMII_API_KEY`
- `RESEND_API_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `NEXTAUTH_SECRET`

🔴 **`.env.example` is committed with all required keys and no values.**  

🔴 **Never log any of the above values.** Sentry breadcrumbs and console logs must not include any secret value, even partially. Mask API keys in error messages as `[REDACTED]`.

---

## Rule 6 — Database at Rest

🔴 **PostgreSQL is hosted on Supabase or Neon, both of which provide disk encryption at rest by default.**  
Do not disable the hosting provider's disk encryption. Confirm it is active during deployment setup.

---

## Rule 7 — No Raw Secrets in Sentry Payloads

🔴 **Before any exception is sent to Sentry, scrub the `metadata` and `extra` fields for known secret key names.**  
Configure Sentry's `beforeSend` hook to remove fields matching: `password`, `hashedPassword`, `cardToken`, `secretKey`, `secretHash`, `apiKey`, `encryptionKey`, `token`, `Authorization`.