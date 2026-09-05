---
trigger: glob
globs:
  - "school.config.ts"
  - ".env*"
  - "src/lib/config.ts"
---

# configuration-and-deployment.md

> 🔴 No school-specific value may appear in source code.  
> A deployment with a hard-coded school name, logo URL, API key, or timezone is a failed build.

---

## Rule 1 — All School-Specific Values Live in Config

🔴 **Every school-specific value is externalised to `.env` or `school.config.ts`.**  
Neither file is ever hard-coded in any source file — not in components, not in tRPC procedures, not in BullMQ jobs, not in tests.

Read them through `src/lib/config.ts` only (see `coding-standards.md`).

---

## The Two Config Files

### `.env` — Secrets and Infrastructure

Contains credentials and infrastructure URLs that vary per deployment and must not be committed:

```bash
# Database
DATABASE_URL=

# Redis
REDIS_URL=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Flutterwave
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_SECRET_HASH=

# Termii
TERMII_API_KEY=
TERMII_SENDER_ID=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_DOMAIN=

# Encryption
ENCRYPTION_KEY=                   # 32 bytes as 64 hex characters

# File storage
CLOUDINARY_URL=                   # or S3 equivalent
STORAGE_BUCKET=

# Monitoring
SENTRY_DSN=
POSTHOG_KEY=                      # Phase 2 only
```

### `school.config.ts` — Non-Secret School Identity

Contains school-specific values that are not secrets and can be committed to a school-specific branch:

```typescript
// school.config.ts
export const schoolConfig = {
  name: "",                         // e.g., "Greenfield Academy"
  logoUrl: "",                      // hosted URL
  address: "",
  phone: "",
  timezone: "Africa/Lagos",         // default for Nigeria
  currency: "NGN",                  // always NGN for v1
  academicTermStructure: "3-term",  // or "2-semester"
  smsMonthlyCapSmsUnits: 0,         // agreed per-school in commercial contract
  domain: "",                       // e.g., "greenfield.schoolfin.app"
  privacyPolicyUrl: "",
} as const;
```

---

## Rule 2 — `.env` Is Never Committed

🔴 **`.env` is in `.gitignore` before the first commit.**  
🔴 **`.env.example` is committed** with all required keys and empty values, serving as the setup checklist for new deployments.

---

## Rule 3 — No Code Changes Required for a New School Deployment

🔴 **A new school deployment requires only:**
1. Clone the main template branch.
2. Create a school-specific branch.
3. Fill in `school.config.ts` with the school's details.
4. Fill in `.env` with the school's credentials.
5. Run `prisma migrate deploy`.
6. Seed the proprietor account.
7. Deploy to Vercel + Railway/Render.

🔴 **If adding a feature requires editing anything other than these two files to deploy to a different school, the feature is not properly externalised.** Stop and fix the externalisation before marking the task done.

_(PRD §7.3, §12 Phase 3)_

---

## Rule 4 — Timezone Is Always `Africa/Lagos` for Nigerian Schools

🔴 **All time-based operations (cron schedules, overdue calculations, receipt timestamps) use `Africa/Lagos` (WAT, UTC+1).**  
Never use `UTC` as the assumed timezone. Always convert to the school's timezone for display and business logic.

The timezone is read from `schoolConfig.timezone`, defaulting to `"Africa/Lagos"`.

---

## Rule 5 — `SMS_MONTHLY_CAP` Must Be Set Before Phase 2

🔴 **`smsMonthlyCapSmsUnits` in `school.config.ts` must be a positive integer agreed in the commercial contract before Phase 2 goes live.**  
The Phase 2 SMS cap enforcement logic divides the current month's usage by this value. If it is zero or unset, the SMS cap check will malfunction.

The value is confirmed with the school before Phase 2 is deployed. _(PRD §13-Q10)_

---

## Rule 6 — Per-School Branch Strategy

🔴 **Each school deployment lives on its own git branch (e.g., `school/greenfield-academy`).**  
The `main` branch is the template. School branches are never merged back into `main`. Bug fixes flow from `main` into school branches via cherry-pick or merge, not the reverse.

This keeps school-specific config out of the shared template.