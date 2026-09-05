# AGENTS.md — SchoolFin

> **This file governs how the AI coding agent builds SchoolFin. It is not a summary of the product. It is a set of binding rules the agent must follow during every session, on every task, without exception.**
>
> **Source of truth for what to build:** `SchoolFin_PRD_v1_1.md`
> **Source of truth for how to build it:** This file.
>
> When the two documents conflict, this file wins on process. The PRD wins on product requirements.

---

## 1. What Is This Project?

**SchoolFin** is a web-based school fee management and finance portal for a single private school in Nigeria. Every monetary value is in Nigerian Naira (NGN). There are exactly four user roles: PARENT, BURSAR, ACCOUNTANT, and PROPRIETOR.

**The version being built right now is determined by the active phase:**

| Phase | Name | Build it when |
|---|---|---|
| Phase 0 | Foundation | Always — this is the starting point |
| Phase 1 | Payments | Only after Phase 0 is complete and signed off |
| Phase 2 | Automation | Only after Phase 1 is complete and signed off |
| Phase 3 | Scale | Only after Phase 2 is complete and signed off |

**Do not build any feature from a later phase while working on an earlier phase.** A feature listed under Phase 2 does not exist for the agent until Phase 1 is signed off. Treat future-phase features as if they were not written anywhere.

---

## 2. What Is Locked

These choices have already been made. The agent must never replace, swap, upgrade, or "improve" any of them. If a locked tool has a problem, report the problem and stop. Do not substitute an alternative.

### 2.1 Framework and Runtime

| Concern | Locked Choice |
|---|---|
| Full-stack framework | Next.js (App Router) |
| API layer | tRPC with role-guard middleware on every procedure |
| ORM | Prisma |
| Database | PostgreSQL (Supabase or Neon) |
| Session store | Redis via `@auth/redis-adapter` |
| Authentication | NextAuth.js with Credentials provider |
| Job queue | BullMQ on Redis |
| Hosting — web | Vercel |
| Hosting — worker | Railway or Render (the worker process, NOT Vercel serverless functions) |
| File storage | Cloudinary or S3 |
| SMS provider | Termii |
| Email provider | Resend |
| Payment gateway | Flutterwave |
| Error monitoring | Sentry |
| Product analytics | PostHog (Phase 2 only) |
| Excel generation | ExcelJS |
| In-browser printing | `react-to-print` |
| PDF generation | Puppeteer with `@sparticuz/chromium` on the worker server |
| Rate limiting | `@upstash/ratelimit` with Redis backend |
| Password hashing | bcrypt, minimum 12 salt rounds |

### 2.2 The Prisma Data Model Is Locked

The schema in Section 9 of the PRD is the authoritative data model. The agent must use it exactly.

- Do not rename any model, field, enum, or index.
- Do not add new models or fields without an explicit instruction that names the field, its type, and its purpose.
- Do not change any field type (e.g., `Decimal` must stay `Decimal` — never `Float` or `Int` for money fields).
- All monetary fields are `Decimal @db.Decimal(12, 2)`. This is mandatory. See Rule MONEY-1.
- The `AuditLog` model is append-only by database grant. Do not create any API route or tRPC procedure that issues an UPDATE or DELETE against the `AuditLog` table.

### 2.3 The tRPC Router Structure Is Locked

The router and procedure names in PRD Section 6.3 are the contract. Use them exactly. Do not rename procedures, do not merge routers, and do not create new routers unless a task explicitly specifies a new router by name.

### 2.4 Configuration Is Externalised — Never Hard-Code School Data

All school-specific values live in `.env` and `school.config.ts`. The agent must never hard-code any of the following values anywhere in source files:

```
SCHOOL_NAME, SCHOOL_LOGO_URL, SCHOOL_ADDRESS, SCHOOL_PHONE,
SCHOOL_TIMEZONE (default: Africa/Lagos),
FLUTTERWAVE_PUBLIC_KEY, FLUTTERWAVE_SECRET_KEY, FLUTTERWAVE_SECRET_HASH,
TERMII_API_KEY, TERMII_SENDER_ID,
RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_DOMAIN,
DATABASE_URL, REDIS_URL,
DEFAULT_CURRENCY (default: NGN),
ACADEMIC_TERM_STRUCTURE,
SMS_MONTHLY_CAP
```

### 2.5 The BullMQ Job Queue Design Is Locked

The queues, job names, schedules, retry policies, and failure behaviours in PRD Section 6.5 are locked. Do not add queues, rename queues, or change retry counts. The exact table from the PRD is reproduced here for reference:

| Queue | Job | Schedule / Trigger | Retries | On Final Failure |
|---|---|---|---|---|
| `notifications` | `send-email` | On event | 3, exponential (1 min, 5 min, 15 min) | Mark FAILED, alert Sentry, in-app bursar alert if no fallback |
| `notifications` | `send-sms` | On event | 3, exponential | Mark FAILED, alert Sentry, in-app bursar alert if no fallback |
| `debt-collection` | `run-debt-scan` | Cron: 08:00 WAT Mon–Fri | 0 | Alert Sentry, log to AuditLog |
| `installments` | `check-due-installments` | Cron: 07:00 WAT daily | 0 | Alert Sentry |
| `installments` | `retry-failed-installment` | Triggered 48 hrs after failure notification | 1 | Flag installment, notify bursar |
| `payments` | `process-flw-webhook` | On webhook receipt | 3 | Alert Sentry, log raw payload |
| `receipts` | `generate-receipt-pdf` | On payment success | 2 | Set `fileUrl` null, log error, parent sees "generating" |
| `payments` | `poll-pending-payments` | Cron: every 15 minutes | 1 | Alert Sentry, log to AuditLog |
| `reports` | `generate-tax-export` | On 25-second sync timeout | 1 | Email user with error message |

---

## 3. What Must Never Happen

**Breaking any rule in this section means the task has failed, even if the code compiles and the feature appears to work.** Rule IDs are provided for easy reference in code reviews.

---

### GROUP A — Money and Financial Integrity

**MONEY-1: Use `Decimal @db.Decimal(12, 2)` for every monetary amount.**
Never use `Float`, `number`, `Int`, or JavaScript floating-point types for any currency value anywhere — in the database schema, in computation, or in API responses. All monetary arithmetic must use Prisma's Decimal type or a Decimal library. Never use `+`, `-`, `*`, `/` operators directly on raw JavaScript floats for money calculations.

**MONEY-2: Compute outstanding balance using only the formula in PRD Module B1.**
The formula is:
```
Outstanding Balance =
    SUM(FeePosting.amount WHERE type = CHARGE)
  − SUM(FeePosting.amount WHERE type = REVERSAL)
  − SUM(Payment.amount WHERE status = SUCCESS)
  − SUM(ManualCredit.amount)
  − Student.creditBalance
```
Never cache this result on the `Student` record (only `creditBalance` lives there). Never approximate it. Never use a shortcut formula.

**MONEY-3: Block duplicate fee postings with no override allowed.**
If a student already has a `FeePosting` for the same `feeStructureId` and `termId`, the system must reject the action entirely and return the exact error message from PRD C2-AC6. No confirmation bypass. No admin override at the application layer. _(PRD §C2-AC6)_

**MONEY-4: Require a bulk-posting confirmation screen before committing.**
Bulk posting to a class must show a confirmation screen listing the class name, number of active students affected, fee structure name, and total amount per student. The bursar must click "Confirm Post" to proceed. Never skip this screen programmatically. _(PRD §C2-AC7)_

**MONEY-5: Allow fee posting reversals only within 24 hours, by the proprietor only.**
Reversals create a new `FeePosting` record with `type = REVERSAL`. They never modify or delete the original record. After 24 hours, the reverse action is disabled in the UI and replaced with the exact message from PRD §C2-AC8. _(PRD §C2-AC8)_

**MONEY-6: Warn and require a reason on overpayment, then store surplus correctly.**
If a manual cash credit exceeds the outstanding balance by more than ₦5,000, show the exact warning from PRD §D1-AC2, require a reason, and flag the transaction `isSensitive: true` in AuditLog and notify the proprietor by email. Store the surplus in `Student.creditBalance`. Never process a cash refund through SchoolFin. _(PRD §D1-AC2, §D1-AC3)_

**MONEY-7: Apply `Student.creditBalance` automatically to the next fee posting.**
When a new fee posting is created for a student, subtract any existing `creditBalance` from the posted amount first and zero out `creditBalance`. Never leave a credit balance sitting without applying it.

**MONEY-8: Parent cannot pay more than the outstanding balance online.**
In the Flutterwave payment flow, the parent can reduce the pre-filled amount but cannot enter an amount greater than the outstanding balance. Enforce this on the server, not only in the UI. _(PRD §E1-AC2)_

**MONEY-9: Never process cash refunds through SchoolFin.**
Overpayments become `Student.creditBalance`. No refund mechanism exists. Do not build one. _(PRD §D1-AC3, PRD §13 resolution for Q7)_

**MONEY-10: Receipt numbers are globally sequential per deployment.**
Format: `RCP-YYYY-NNNNNN`. The `NNNNNN` part is a zero-padded auto-increment shared across all students. Never generate receipt numbers per-student. Never use a UUID for a receipt number. _(PRD §Assumption 21)_

---

### GROUP B — Authentication and Access Control

**AUTH-1: Enforce RBAC on every tRPC procedure and every page route.**
Every tRPC procedure must call the role-guard middleware before executing any logic. A role without permission receives `UNAUTHORIZED` with no data in the response body. A user navigating to a restricted URL is redirected to their own dashboard with a 403. _(PRD §A3)_

**AUTH-2: The RBAC permission matrix is the law.**
The matrix in PRD Section 6.2 is the complete and final authority on who can do what. Do not grant any role a permission that is not in that table. Do not infer permissions. Do not allow a lower role to call a higher-role procedure because it "seems harmless." _(PRD §6.2)_

**AUTH-3: Parents cannot self-register.**
Only the bursar creates parent accounts. There is no self-registration route, page, or API procedure for parents. _(PRD §A4, §13 resolution for Q6)_

**AUTH-4: A parent cannot access the portal before accepting the invite.**
A `User` with role `PARENT` and `isActive = true` but no accepted invite must not be able to log in. Enforce this at the session level. _(PRD §A4-AC4)_

**AUTH-5: Invite links expire after 48 hours and are single-use.**
Generating a new invite invalidates the old one. A used or expired link returns an error on the second visit. Log password reset actions in AuditLog. _(PRD §A4, §A2)_

**AUTH-6: Password reset links expire after 30 minutes and are single-use.**
A second click on a used reset link must return an error, never silently succeed. _(PRD §A2-AC3)_

**AUTH-7: Use generic error messages on authentication failures.**
Failed login returns exactly "Invalid email or password" — nothing more. Password reset confirmation returns the same success message for registered and unregistered emails alike. Never indicate which field failed. _(PRD §A1-AC2, §A2-AC2)_

**AUTH-8: Apply rate limits exactly as specified.**
- Login: 5 attempts per IP per 60 seconds → block for 15 minutes → 429 response. _(PRD §A1-AC3, §6.7)_
- Password reset: 3 requests per email per hour. _(PRD §6.7)_
- Payment initiation: 10 requests per parent session per hour. _(PRD §6.7)_
- API-wide: 200 requests per IP per minute on all tRPC routes. _(PRD §6.7)_
- Webhook endpoint: 500 requests per minute. _(PRD §6.7)_
- Receipt verification endpoint: 60 requests per IP per minute. _(PRD §6.7, §L1-AC7)_

**AUTH-9: Sessions use HTTP-only, Secure, SameSite=Strict cookies.**
Session tokens rotate on every request. Idle timeout is 30 minutes. Absolute maximum is 8 hours. Use Redis as the session store. _(PRD §6.1)_

---

### GROUP C — Data Integrity and the Audit Log

**AUDIT-1: Write an AuditLog record for every create, update, or status-change action.**
No exception. Every P0 action produces an AuditLog entry before the function returns. The AuditLog record must include `userId`, `action`, `entity`, `entityId`, `metadata` (JSON of changed fields), `isSensitive`, and `createdAt`. _(PRD §J1)_

**AUDIT-2: Never issue an UPDATE or DELETE against the AuditLog table.**
The database service account has INSERT and SELECT on `AuditLog` only. Do not create any application-layer code that attempts to modify or remove an AuditLog record. If you need to indicate a reversal, write a new record. _(PRD §J1-AC3)_

**AUDIT-3: Flag these actions as `isSensitive: true` in AuditLog:**
`MANUAL_CREDIT_CREATED`, `PAYMENT_REFUNDED`, `USER_ROLE_CHANGED`, `FEE_WAIVER_APPLIED`, `OVERPAYMENT_OVERRIDE`. All session creation and destruction events must also be written. _(PRD §J1-AC4)_

**AUDIT-4: Store all Flutterwave raw webhook payloads in AuditLog metadata.**
Every incoming webhook event — success, failure, or refund — must have its full raw payload stored in `AuditLog.metadata` before processing begins. _(PRD §6.4, §E1-AC7)_

**AUDIT-5: All records are append-only. No hard deletes anywhere in the system.**
Deactivating a user, fee structure, installment plan, or parent–student link is always a soft action: set `isActive = false` (or the equivalent flag). Never issue a `DELETE` statement for any user-visible entity. _(PRD §4.4, §4.2 permissions table)_

**AUDIT-6: Detect and warn on duplicate cash payments.**
Before saving a manual credit, check for an existing `ManualCredit` record with the same `studentId`, `amount`, `recordedById`, and same calendar day. If found, show the warning from PRD §D1-AC10, require a typed reason, and flag the record `isSensitive: true`. _(PRD §D1-AC10)_

---

### GROUP D — Payments and Flutterwave Integration

**PAY-1: Verify every Flutterwave webhook signature before processing.**
Compare the `verif-hash` header against `FLUTTERWAVE_SECRET_HASH` from environment variables. Return 401 immediately for any mismatch. Never process the payload of an unverified request. _(PRD §6.4)_

**PAY-2: Acknowledge the webhook immediately; process asynchronously.**
Write the verified payload to a BullMQ queue and return HTTP 200 to Flutterwave without waiting for processing to complete. Never block the webhook endpoint on database writes or downstream calls. _(PRD §6.4)_

**PAY-3: Implement idempotency on webhook processing.**
If a webhook arrives with a `flutterwaveRef` that already has `status = SUCCESS` in the database, discard the duplicate without reprocessing. Never double-credit a student account. _(PRD §6.4)_

**PAY-4: Implement the `poll-pending-payments` fallback job exactly as specified.**
Every 15 minutes, query all `Payment` records with `status = PENDING` and `createdAt` older than 10 minutes. For each, call the Flutterwave verify-transaction endpoint. If confirmed successful, update status to `SUCCESS`, credit the student account, create a `Receipt`, and queue the parent notification. _(PRD §6.5)_

**PAY-5: Encrypt card tokens with AES-256 before writing to the database.**
Store the encryption key in environment variables only. Never log, print, or transmit the raw card token or the encryption key. Never store actual card numbers. SchoolFin never touches Flutterwave card data directly. _(PRD §6.6, §F2-AC4)_

**PAY-6: Only charge the first installment immediately; store token for subsequent charges.**
If Flutterwave does not return a card token (e.g., parent paid via bank transfer or USSD), set `cardToken` to null and show "Pay Now" buttons for subsequent installments. Never attempt an auto-charge when `cardToken` is null. _(PRD §F2-AC4)_

**PAY-7: Send a pre-retry notification 24 hours before retrying a failed installment.**
The message must use the exact text from PRD §F3-AC2. Only retry at 48 hours after the failure notification was sent. After 3 consecutive failures, set `isFlagged: true` and notify the bursar. _(PRD §F3)_

**PAY-8: Abstract the Flutterwave integration behind a `PaymentGateway` service interface.**
All Flutterwave calls (initiate payment, verify transaction, tokenise card, auto-charge) must go through this interface. No component, tRPC procedure, or BullMQ worker should import the Flutterwave SDK or call Flutterwave URLs directly. This allows future provider swaps with changes confined to one module. _(PRD §8)_

---

### GROUP E — Security and Encryption

**SEC-1: Encrypt PII columns at the application layer using AES-256 before writing to the database.**
The columns are: `User.phone`, `User.email`. The encryption key lives in environment variables only, never in the database or source code. _(PRD §6.6)_

**SEC-2: Enforce HTTPS on all routes. Redirect HTTP to HTTPS.**
TLS 1.2 is the minimum. Do not allow any route to serve over plain HTTP in any environment other than local development. _(PRD §6.6)_

**SEC-3: Never commit secrets to the repository.**
`FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_SECRET_HASH`, `TERMII_API_KEY`, `RESEND_API_KEY`, `DATABASE_URL`, `REDIS_URL`, encryption keys, and all credentials live in environment variables only. Add all `.env*` files (except `.env.example`) to `.gitignore` before the first commit. _(PRD §6.6)_

**SEC-4: Signed receipt URLs expire after 1 hour.**
Receipt PDFs stored in Cloudinary or S3 must be served via signed URLs with a 1-hour expiry. Never expose a permanent public URL for a receipt file. _(PRD §6.6)_

**SEC-5: The receipt verification endpoint exposes only the minimum required data.**
The `GET /verify/receipt/[receiptNumber]` endpoint returns: student first name only, amount paid, date of payment, school name, and payment method. Never return the student's last name, admission number, class, email, or phone from this endpoint. No authentication is required. _(PRD §L1-AC3, §L1-AC5)_

**SEC-6: CSRF protection must be enabled.**
Use NextAuth.js built-in CSRF token. Never disable it. _(PRD §6.1)_

---

### GROUP F — Notification Rules

**NOTIF-1: SMS goes through Termii. Email goes through Resend. No substitutions.**
Do not call any other SMS or email provider. Do not fall back to a different provider on failure. _(PRD §K1-AC8)_

**NOTIF-2: On notification final failure with no fallback channel, trigger an in-app bursar alert.**
The alert text is exactly: _"[Student Name]'s parent could not be reached — [notification type] delivery failed. No fallback channel is available. Please contact the parent directly."_ Show this on the bursar's next dashboard load. _(PRD §K1-AC9)_

**NOTIF-3: When SMS usage reaches 100% of `SMS_MONTHLY_CAP`, pause all automated SMS sending.**
When usage reaches 80%, email the proprietor an alert. When usage reaches 100%, pause automated SMS and show the exact in-app message from PRD §7.2 to the bursar. Do not let the system attempt SMS sends beyond the cap without explicit top-up. _(PRD §7.2)_

**NOTIF-4: The debt collection cron must not send a message if `paymentDueDate` is not set on the active term.**
If `paymentDueDate` is null, the engine logs a configuration warning to Sentry and skips the term entirely. It does not send any messages. _(PRD §G2-AC2)_

**NOTIF-5: Deduplicate debt collection messages by `ruleId`, not by stage.**
Before sending any debt collection message, check `DebtCollectionEvent` for the same `studentId` and `ruleId` within the past 7 days. If found, skip. Updating a rule's template mid-term must not suppress future sends — deduplication is scoped to the specific rule record, not the stage enum. _(PRD §G2-AC7)_

**NOTIF-6: Respect the `isPaused` flag on student accounts.**
The debt collection engine must check `Student.isPaused` (or the equivalent pause flag on the account) before sending any automated message for that student. If paused, skip and log. _(PRD §G2-AC4, §G3)_

---

### GROUP G — Scope and Phase Discipline

**SCOPE-1: Do not build Phase 3 features during Phase 0, 1, or 2.**
WhatsApp notifications, mobile money payments, multi-school validation, and offline-first PWA features are Phase 3. Do not scaffold, stub, or partially implement them in earlier phases.

**SCOPE-2: Do not build non-goals from PRD Section 3.**
The following are explicitly out of scope for v1 and must not be built under any framing:
- Multi-school or multi-tenant architecture.
- Student academic records, grades, or attendance.
- Payroll, staff salaries, or budget management.
- Native mobile apps (iOS or Android).
- WhatsApp notifications (Phase 3 only).
- Mobile money payments (Phase 3 only).
- SIS integration (API hooks documented in Phase 3 — no build in v1).
- In-app scholarship/waiver approval workflow (waiver = manual credit by bursar).
- Automated bank reconciliation or direct bank account integration.
- Formal dispute approval workflow (approve/reject buttons) for manual credits.

**SCOPE-3: A fifth user role does not exist unless explicitly added by the client.**
The system has exactly four roles: PARENT, BURSAR, ACCOUNTANT, PROPRIETOR. Do not create a VIEW_ONLY role, a SECRETARY role, or any other role. This is an open question in PRD §13-Q9 and is unresolved. _(PRD §13-Q9)_

**SCOPE-4: The accountant has no write access.**
The ACCOUNTANT role can view all student accounts, all reports, and can export. The ACCOUNTANT cannot create, edit, or delete any record. Enforce this in the RBAC middleware. _(PRD §4.3, §6.2)_

---

### GROUP H — Performance Targets That Are Requirements

These are not aspirational metrics. Failing them means the feature is not complete.

**PERF-1:** The debtor list must load within 2 seconds for up to 500 student records. All filtering is server-side with a 300ms debounce. The full unfiltered list is never loaded into the client browser. _(PRD §H1-AC1, §H1-AC5)_

**PERF-2:** The tax audit Excel export must complete within 30 seconds for a full academic year's data. A server-side timeout of 25 seconds applies. On timeout, hand off to the `generate-tax-export` BullMQ worker and show the exact message from PRD §I2-AC8. _(PRD §I2-AC7, §I2-AC8)_

**PERF-3:** The debtor list Excel export must download within 5 seconds for up to 500 rows. _(PRD §H2-AC3)_

**PERF-4:** Online receipt PDFs must be available within 60 seconds of payment completion under normal load. When `Receipt.fileUrl` is null, show the "generating" state with an auto-refresh every 15 seconds. _(PRD §E1-AC8)_

**PERF-5:** Login must complete and redirect to the role-specific dashboard within 2 seconds. _(PRD §A1-AC1)_

**PERF-6:** The income report must update within 3 seconds of changing filter parameters. _(PRD §I1-AC5)_

---

## 4. Folder Layout

```
schoolfin/
├── AGENTS.md                    ← this file
├── school.config.ts             ← per-school configuration (non-secret values)
├── .env                         ← secrets (never committed)
├── .env.example                 ← template with all required keys, no values
├── prisma/
│   ├── schema.prisma            ← locked data model from PRD §9
│   └── migrations/              ← generated migration files only, never hand-edited
├── src/
│   ├── app/                     ← Next.js App Router pages and layouts
│   │   ├── (auth)/              ← login, password reset, invite acceptance
│   │   ├── (parent)/            ← parent-facing pages
│   │   ├── (bursar)/            ← bursar-facing pages
│   │   ├── (accountant)/        ← accountant-facing pages
│   │   ├── (proprietor)/        ← proprietor-facing pages
│   │   ├── api/
│   │   │   └── webhooks/
│   │   │       └── flutterwave/ ← webhook handler (POST only)
│   │   └── verify/
│   │       └── receipt/[receiptNumber]/  ← public receipt verification (Module L1)
│   ├── server/
│   │   ├── trpc/
│   │   │   ├── router/          ← one file per router (auth, students, fees, payments…)
│   │   │   ├── middleware/      ← role-guard middleware, session validation
│   │   │   └── index.ts         ← root router assembly
│   │   ├── services/
│   │   │   ├── payment-gateway/ ← PaymentGateway interface + FlutterwaveAdapter
│   │   │   ├── notifications/   ← email (Resend) and SMS (Termii) service modules
│   │   │   ├── receipts/        ← receipt PDF generation logic (Puppeteer, worker only)
│   │   │   ├── encryption/      ← AES-256 encrypt/decrypt utilities
│   │   │   └── balance/         ← outstanding balance computation (single function, Module B1 formula)
│   │   ├── jobs/                ← one file per BullMQ job type
│   │   │   ├── send-email.ts
│   │   │   ├── send-sms.ts
│   │   │   ├── run-debt-scan.ts
│   │   │   ├── check-due-installments.ts
│   │   │   ├── retry-failed-installment.ts
│   │   │   ├── process-flw-webhook.ts
│   │   │   ├── generate-receipt-pdf.ts
│   │   │   ├── poll-pending-payments.ts
│   │   │   └── generate-tax-export.ts
│   │   └── db/
│   │       └── prisma.ts        ← singleton Prisma client
│   ├── components/
│   │   ├── ui/                  ← shared UI primitives (buttons, modals, tables)
│   │   ├── receipt/             ← receipt layout component (used by react-to-print)
│   │   └── [feature]/           ← feature-specific components
│   ├── lib/
│   │   ├── auth.ts              ← NextAuth.js configuration
│   │   ├── rate-limit.ts        ← Upstash rate-limit configurations
│   │   ├── audit.ts             ← AuditLog write helper
│   │   └── constants.ts         ← enums, role lists, action strings
│   └── types/
│       └── index.ts             ← shared TypeScript types and tRPC output types
├── worker/                      ← separate process: Puppeteer receipt generation, BullMQ workers
│   ├── index.ts                 ← worker entry point
│   └── queues/                  ← queue connection and registration
└── tests/
    ├── unit/                    ← pure function tests (balance formula, encryption, deduplication)
    ├── integration/             ← tRPC procedure tests with a test database
    └── e2e/                     ← Playwright tests for critical user flows
```

**Hard rules about the folder layout:**

- Puppeteer and `@sparticuz/chromium` are imported only inside `worker/`. They must never appear in `src/app/`, `src/server/trpc/`, or anywhere that could be bundled into a Vercel serverless function.
- The `PaymentGateway` interface lives in `src/server/services/payment-gateway/`. Nothing outside this folder imports from the Flutterwave SDK directly.
- The balance formula function lives in `src/server/services/balance/` and is the single source of truth for all balance calculations. No component or procedure computes a balance inline.
- The `audit.ts` helper is the only way to write AuditLog records. No procedure calls `prisma.auditLog.create` directly.

---

## 5. How Should the Code Look?

### Language and Runtime

- TypeScript everywhere. `strict: true` in `tsconfig.json`. No `any` types except when wrapping an untyped third-party SDK — and even then, add a type assertion immediately.
- Node.js LTS version. Never use a feature from a Node.js version that is not on an LTS release line.
- ESM modules. No CommonJS `require()`.

### Style Rules

- **Functions are short.** A function that is longer than 50 lines should be split unless there is an explicit reason not to (e.g., a complex SQL query that must stay together).
- **No inline business logic in route handlers or tRPC procedures.** Procedures are thin: validate input with Zod, call a service function, return the result. Business rules live in `src/server/services/`.
- **Zod schemas for all tRPC inputs.** No procedure accepts raw `unknown` input without a Zod schema.
- **No silent failures.** Every `catch` block either re-throws, logs to Sentry, or returns an explicit error response. `catch (e) {}` with an empty body is forbidden.
- **Async/await, not callbacks or raw `.then()`/`.catch()` chains.** Use `Promise.all` for parallel independent operations.
- **Named exports, not default exports**, except for Next.js page components and API route handlers where the framework requires `export default`.
- **One concern per file.** A file that mixes a tRPC router with a service function, a BullMQ worker, and UI components is a violation.
- **Environment variables are read once**, in a validated config module (`lib/config.ts`), not scattered across files with `process.env.SOME_KEY` inline. Fail fast at startup if a required variable is missing.

### Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files and folders | `kebab-case` | `run-debt-scan.ts` |
| React components | `PascalCase` | `ReceiptCard.tsx` |
| Functions and variables | `camelCase` | `computeOutstandingBalance` |
| Constants | `SCREAMING_SNAKE_CASE` | `SMS_MONTHLY_CAP` |
| Prisma models | match the schema exactly | `AuditLog`, `FeePosting` |
| tRPC procedures | match the PRD router spec exactly | `fees.postToClass` |

### Formatting

- Prettier with default settings. No custom Prettier config.
- No trailing whitespace. No unused imports. Run `tsc --noEmit` and `eslint` before marking a task done.

---

## 6. What Counts as Done?

A task is complete when the agent can produce the following checklist and every item is checked. The agent must paste this checklist (filled in) as the final message of every task.

```
## Completion Checklist

### Build
- [ ] `tsc --noEmit` runs with zero errors
- [ ] `eslint` runs with zero errors (warnings allowed, must be documented)
- [ ] `prisma validate` passes with no schema errors
- [ ] Application starts locally without crashing

### Requirements
- [ ] Every PRD acceptance criterion for this task is implemented
  (list each AC by module and number, mark each one individually)
- [ ] RBAC enforced: every new tRPC procedure has a role-guard middleware check
- [ ] AuditLog: every new state-changing action writes an AuditLog record
- [ ] No hard-coded school-specific values (school name, logo, keys, etc.)
- [ ] No Puppeteer imports outside the `worker/` directory

### Money and Financial Safety
- [ ] All monetary fields use `Decimal`, not `Float` or `number`
- [ ] Balance is computed using the exact formula from Module B1
- [ ] No new balance cache field added to the Student model

### Security
- [ ] No secrets committed to the repository
- [ ] New PII fields (if any) are encrypted at application layer before write
- [ ] New endpoints (if any) have rate limiting applied
- [ ] Flutterwave webhook signature verified before processing (if applicable)

### Notifications (if applicable)
- [ ] SMS cap check implemented before any SMS send
- [ ] Notification failures trigger in-app bursar alert when no fallback exists
- [ ] Debt collection deduplication uses `ruleId`, not stage

### Scope
- [ ] No Phase 3 features introduced
- [ ] No new models or fields added to Prisma schema without explicit instruction
- [ ] No new tRPC routers or procedures added beyond those in PRD §6.3

### Phase (state the phase being built)
- [ ] Phase: _______
- [ ] All features for this phase are complete per the phased roadmap in PRD §12
- [ ] No features from a later phase have been added
```

---

## 7. What Does the Agent Do When Unsure?

**Default action: stop and ask. Never invent.**

When the agent is unsure about any of the following, it must stop the current task, write a clear question, and wait for a human answer before continuing:

- What a PRD requirement means in practice.
- Whether a new library, tool, or service is acceptable.
- Whether a schema change is needed to implement a feature.
- Whether a behaviour not described in the PRD is needed to make a feature work.
- Which of two conflicting interpretations of a requirement is correct.

**The following responses to uncertainty are forbidden:**

- Adding a new feature, model, field, route, or behaviour that is not in the PRD or this file, even as a "just in case" measure.
- Leaving a `TODO` comment and moving on as if the task is done.
- Writing spaghetti code to "make it work for now" with the intention of cleaning it up later.
- Choosing a library or tool that is not in the locked stack because it seems "better."
- Guessing at a business rule and implementing the guess without flagging it.
- Expanding the scope of a task because a related thing "makes sense to do at the same time."

**The exact words the agent should use when stopping to ask:**

> "I am unsure about [specific thing]. Before I continue, I need clarification on [specific question]. The two options I see are [A] and [B]. Which is correct?"

If the agent reaches the end of a task and realises a decision it made mid-task was a guess, it must surface that guess explicitly in the completion checklist under a "Decisions Made Without Explicit Guidance" section and flag it for human review before the task is merged.

---

## Appendix: Self-Attack Review

*The following weaknesses were identified in this file during self-review and addressed.*

1. **Was the balance formula stated precisely?** Yes — the exact formula from PRD Module B1 is reproduced in MONEY-2 with field names matching the Prisma schema.

2. **Were phase gates specific enough?** Yes — the phase table in Section 1 makes the gate condition explicit ("only after previous phase is complete and signed off").

3. **Is the Puppeteer constraint enforceable?** Yes — the folder layout section names the exact directories where Puppeteer is forbidden, and the completion checklist has a dedicated checkbox.

4. **Does the RBAC section just say "enforce RBAC" or does it give the agent the actual matrix?** It references PRD §6.2 by section number and also states the rule that the matrix is the complete and final authority. The agent must open the PRD to read the matrix, which is correct — reproducing it in full here would create a maintenance risk if the PRD changes.

5. **Is the "when unsure" section actionable?** Yes — it gives the exact words the agent should write, and it lists specific forbidden responses by name, not just vague guidance to "be careful."

6. **Could the agent mistake a performance target for an aspirational goal?** Rule section GROUP H explicitly states that performance targets are requirements and failure to meet them means the feature is not complete.

7. **Is the payment abstraction rule enforceable?** Yes — SCOPE-2 and PAY-8 together make it clear that no code outside `src/server/services/payment-gateway/` imports from the Flutterwave SDK. The folder layout reinforces this with a named directory boundary.

8. **Does anything in this file contradict the PRD?** No contradictions found. Where this file adds specifics not in the PRD (e.g., exact folder names, function length limits), those additions are consistent with the PRD's intent and do not restrict or expand any product requirement.

---

*End of AGENTS.md*
