---
trigger: always_on
---

# phase-gates.md

> 🔴 Building any feature from a future phase while the current phase is incomplete is a failed task.

---

## The Gate Model

Each phase is a hard gate. The gate opens only when the previous phase is complete and signed off by the project owner. "Signed off" means the project owner has reviewed the completion checklist and approved in writing.

| Phase | Name | Gate condition |
|---|---|---|
| Phase 0 | Foundation | Always start here |
| Phase 1 | Payments | Phase 0 signed off |
| Phase 2 | Automation | Phase 1 signed off |
| Phase 3 | Scale | Phase 2 signed off |

---

## What Is In Each Phase

### Phase 0 — Foundation
- Authentication (login, password reset, session, route protection)
- RBAC (all four roles, full permission matrix)
- Parent account creation and student linking (Module A4)
- Student management (create, edit, deactivate, link to parent)
- Student financial profile — bursar view (Module B1)
- Fee structure management (Module C1)
- Fee posting — individual and bulk (Module C2)
- Manual cash payment crediting and receipt printing (Module D1)
- Public receipt verification endpoint (Module L1)
- Basic proprietor dashboard (student count, fees posted, collected this term)
- Academic term management
- User account management (proprietor creates/deactivates bursar and accountant accounts)
- Audit logging for all P0 actions

### Phase 1 — Payments
- Flutterwave integration (inline popup, webhook handler)
- `poll-pending-payments` BullMQ fallback job
- Online payment flow for parents (Module E1)
- Card tokenisation and encrypted storage (Module F2)
- Installment plan presets (Module F1)
- Parent installment plan selection (Module F2)
- Installment tracking and failure handling (Module F3)
- Pre-retry notification (Module F3)
- Online payment receipt PDF via Puppeteer on worker
- Receipt pending UI state
- Parent portal view — simplified financial profile (Module B2)
- Payment confirmation notifications (email + SMS)
- Payment failure notifications
- In-app bursar alert for notification delivery failures

### Phase 2 — Automation
- Automated debt collection engine (Module G)
- Debt collection rule configuration UI (Module G1)
- Communication template editor (Module G2)
- Per-student message pause toggle (Module G3)
- Debt collection event log with `ruleId`
- Debtor list view with server-side filters (Module H1)
- Bulk manual reminder from debtor list
- Excel export of debtor list (Module H2)
- School income report (Module I1)
- Tax auditor Excel export with BullMQ fallback (Module I2)
- `SMS_MONTHLY_CAP` dashboard widget and alert
- Full audit log viewer for proprietor (Module J1)
- NDPA compliance features (Module J2)
- Sentry and PostHog integration

### Phase 3 — Scale (Do not build until Phase 2 is signed off)
- WhatsApp notifications via WhatsApp Business API
- Mobile money payments via Flutterwave
- Advanced analytics dashboard
- Multi-school deployment validation
- Optional offline-first PWA
- API hook documentation for SIS integration

---

## What "Does Not Exist Yet" Means

🔴 **A feature from a future phase must not appear in the codebase in any form:**
- No stub functions that return `null` or `throw new Error("Not implemented")`
- No commented-out code for future phases
- No database schema fields added for future-phase features
- No UI placeholders, disabled buttons, or greyed-out menu items for Phase 3 features
- No tRPC procedures defined but not implemented
- No BullMQ job registrations for jobs that will not run until a future phase

If you find yourself writing a comment like `// TODO: Phase 2`, stop. Either the feature is in the current phase and should be implemented, or it is not in the current phase and should not exist in any form.

---

## Phase 0 Dependencies

🔴 **These must be live and verified before Phase 0 development starts:**
- PostgreSQL database (Supabase or Neon) — provisioned, migrated, accessible
- Redis — provisioned and accessible
- NextAuth.js configured with session store pointing to Redis

---

## Phase 1 Dependencies

🔴 **These must be confirmed before Phase 1 development starts:**
- Flutterwave account credentials from the school — active account, not just registered
- Termii account configured with a sender ID
- Resend account with domain configured
- Flutterwave tokenisation API availability confirmed on the school's Flutterwave plan

_(PRD §12 Phase 1 Dependencies)_

---

## Phase 2 Dependencies

🔴 **Before Phase 2 development starts:**
- BullMQ and Redis production configuration verified on Railway/Render
- Test cron execution confirmed (some platforms throttle cron workers)

---

## Phase 3 Dependencies

🔴 **Before Phase 3 development starts:**
- WhatsApp Business API approval from Meta (can take 2–4 weeks — start during Phase 2)
- Second school client identified for multi-school template validation