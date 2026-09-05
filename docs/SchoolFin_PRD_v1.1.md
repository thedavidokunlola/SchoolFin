# SchoolFin
## School Fee Management & Finance Portal
### Product Requirements Document
**Version 1.1 | Nigeria (NGN) | Single-School Deployment**

> **Change log — v1.0 → v1.1:** This version incorporates all corrections from the structured PRD review. Every change is tagged `[FIX-N]` where N matches the numbered lapse list from that review. No content from v1.0 has been silently altered; every departure from the original is intentional and traceable.

---

## Table of Contents

1. [Product Summary](#1-product-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Non-Goals](#3-goals-and-non-goals)
4. [User Personas](#4-user-personas)
5. [Functional Requirements](#5-functional-requirements)
6. [Technical Requirements](#6-technical-requirements)
7. [Business Model](#7-business-model)
8. [Risks and Mitigations](#8-risks-and-mitigations)
9. [Prisma Data Model](#9-prisma-data-model)
10. [Success Metrics](#10-success-metrics)
11. [Assumptions](#11-assumptions)
12. [Phased Roadmap](#12-phased-roadmap)
13. [Open Questions](#13-open-questions)

---

## 1. Product Summary

SchoolFin is a single-school, web-based fee management and finance portal built for private schools in Nigeria. It gives the school bursar a central command centre to post fees, record cash payments, manage installment plans, and run the debtor list. Parents log in under one account to see all their children's balances, make online payments via Flutterwave, download receipts, and receive automated overdue reminders. The accountant gets clean, audit-ready Excel exports for tax reconciliation. The proprietor sees a live financial dashboard and controls all system configuration.

Every naira that enters or leaves a student account is tracked, timestamped, and attributed to the person who recorded it — eliminating the manual tracking errors and debt follow-up gaps that leave a portion of collectable fees uncollected each term. `[FIX-21: removed unsourced 15–30% revenue loss figure]`

---

## 2. Problem Statement

### Parents

- No visibility into their child's fee account between school visits — parents must call the bursar or come in person to know their balance.
- No digital payment option — parents carry cash to school, creating security and convenience problems.
- No receipt archive — parents lose paper receipts and cannot prove payment if a dispute arises.
- When a payment dispute arises, parents have no verifiable record, and the school has no audit trail to resolve it quickly. `[FIX-2a: added dispute scenario]`
- Parents with multiple children must manage separate paper fee cards per child, with no consolidated view.

### Bursar

- Fee collection tracked in Excel spreadsheets or paper ledgers — prone to formula errors, version conflicts, and data loss.
- Cash payments recorded manually with no automatic receipt numbering or audit trail.
- Debt follow-up done via manual phone calls or WhatsApp messages — no systematic reminder schedule, no log of who was contacted and when.
- No automated installment tracking — bursar manually checks who missed a payment and sends individual reminders.
- Producing a debtor list for any given class or term requires manual spreadsheet manipulation that takes 1 to 3 hours per report.
- Tax audit preparation requires exporting and reformatting multiple spreadsheets, taking days of manual work.

### Accountant

- No single source of truth for income received vs fees outstanding — must reconcile multiple spreadsheets and paper records.
- Cannot produce a term-end income statement without requesting raw data from the bursar, waiting for it, and cleaning it manually.
- Tax auditors require a format the school cannot produce quickly, creating compliance risk.

### Proprietor

- No real-time visibility into the school's financial position — must wait for the bursar's end-of-term report.
- No audit trail for manual account adjustments — cannot verify whether a credit was correctly applied or reversed.
- Cannot see which classes or terms have the highest debt concentration without requesting a custom report.

---

## 3. Goals and Non-Goals

### Goals

- **[FIX-14a]** Record 100% of term fee transactions in SchoolFin (online or recorded cash) by the end of Term 1 post-launch. This establishes SchoolFin as the single source of truth for all fee activity.
- **[FIX-14b]** Achieve 40% or more of term fees paid online via Flutterwave by the end of Term 2 post-launch. This is the commercial digital-adoption metric.
- Reduce average outstanding debt per student by 40% within two school terms of go-live.
- Reduce bursar time spent on debtor list generation from 2+ hours to under 5 minutes per report.
- Achieve 70% parent portal login rate (at least one login per term per parent) within 6 months.
- Achieve 40% parent online payment rate (at least one Flutterwave payment per term per parent) by end of Term 2 post-launch. `[FIX-21b: added commercial payment metric]`
- Deliver notification delivery rate of 95% or above for SMS and 98% or above for Email across the automated debt collection engine.
- Generate a tax-audit-ready Excel export in under 30 seconds for any date range.
- Maintain 99.5% system uptime during school term fee-payment windows.
- Structure the codebase so that a new school deployment can be configured and launched in under 5 working days.

### Non-Goals (v1)

- Multi-school or multi-tenant architecture. Each deployment serves exactly one school.
- Student academic records, grades, attendance, or any non-financial student data.
- Payroll, staff salaries, or school budget management.
- Parent-to-parent communication or school-wide announcements.
- Mobile native apps (iOS or Android). The portal is web-responsive only.
- WhatsApp notifications. Scoped to Phase 3. `[FIX-13: was incorrectly listed as Phase 2]`
- Mobile money payments. Scoped to Phase 3 via Flutterwave.
- Integration with any Student Information System (SIS). API hooks documented but not built in v1.
- In-app bursary scholarship application workflow. The bursar applies fee waivers directly as manual credits.
- Automated bank reconciliation or direct school bank account integration.
- Formal dispute approval workflow (approve/reject buttons). The proprietor reviews sensitive manual credits via the audit log. `[FIX-19]`

---

## 4. User Personas

### 4.1 Parent — Ngozi Adeyemi

Ngozi has two children in JSS 2 and Primary 4 at the school. She runs a small catering business and pays fees at the start of each term when she has cash available.

**Jobs to be done:**
- Check each child's current balance and what fees are outstanding.
- Make a payment online without leaving her shop.
- Download a receipt to show her husband or keep for records.
- See if she is on an installment plan and when the next payment is due.

**Frustrations resolved:**
- No more calls to the bursar to ask "how much is left to pay".
- No more lost paper receipts.
- Single login shows both children — no separate portals.

**Permissions:**

| Action | Allowed |
|---|---|
| View own children's financial profiles (balance, fee breakdown, payment history, installment status) | Yes |
| Make online payments via Flutterwave | Yes |
| Select an installment plan | Yes |
| Download own receipts as PDF | Yes |
| Edit any data | No |
| View other students' profiles | No |

---

### 4.2 Bursar — Mr Emeka Okafor

Emeka has been the school's finance officer for 6 years. He currently manages fee records in a combination of Excel and handwritten ledgers. He handles between 40 and 80 parent interactions per week during peak payment periods.

**Jobs to be done:**
- Post fees to an entire class in bulk at the start of each term.
- Record cash payments made in the office and print a receipt on the spot.
- Check which students are overdue and filter by class, term, or amount.
- Pause automated reminders for a parent who has made a direct arrangement.
- Add an internal note to a student account explaining a special payment arrangement.
- Export the debtor list to share with the proprietor.

**Frustrations resolved:**
- No more manual Excel debt lists that take hours to compile.
- No more tracking payment reminders in a notebook.
- Printable receipt generated in one click instead of handwritten carbon copy.

**Permissions:**

| Action | Allowed |
|---|---|
| View all student financial profiles | Yes |
| View internal notes | Yes |
| View debt collection log | Yes |
| View audit log | No |
| Post fees (individual and bulk by class) | Yes |
| Record manual cash credits | Yes |
| Create installment plan presets | Yes |
| Pause/resume automated messages per student | Yes |
| Add internal notes | Yes |
| Export debtor list and income report | Yes |
| Export tax audit file | No |
| Configure fee structures and debt rules | Yes |
| Apply fee waiver | Yes |
| Reprint any receipt | Yes |
| Delete any record | No — all records are append-only |

---

### 4.3 Accountant — Mrs Funke Bello

Funke handles the school's books and prepares year-end financial statements for the tax auditor. She works part-time and needs clean, exportable data without having to ask the bursar for raw spreadsheets.

**Jobs to be done:**
- Run a term-end income report showing total fees billed vs collected vs outstanding.
- Export a formatted Excel file for the tax auditor with no further formatting required.
- Filter the debtor list by term or class and export it.

**Frustrations resolved:**
- No more waiting for the bursar to compile and send spreadsheets. She can now self-serve all exports directly from the portal.
- No more manually formatting raw data for auditors.

**Permissions:**

| Action | Allowed |
|---|---|
| View all student accounts (read-only) | Yes |
| View all reports and full debtor list | Yes |
| Export all reports to Excel | Yes |
| Export debtor list to Excel | Yes |
| Export per-student receipt history | Yes |
| Export tax audit file | Yes |
| Create, edit, or delete any record | No |

---

### 4.4 Proprietor — Dr Abiodun Fashola

Dr Fashola owns the school and reviews financial performance monthly. He wants a live dashboard and full control over system configuration without needing to call the bursar for summaries.

**Jobs to be done:**
- View total fees collected, outstanding, and income by class for the current term.
- Create and manage user accounts for new bursars or accountants.
- Configure fee structures, academic terms, and installment plan options at the start of each term.
- Review sensitive manual account adjustments via the audit log and follow up with the bursar directly. `[FIX-19: replaced "review and approve disputed adjustments" with what the system actually supports]`
- Configure debt collection trigger thresholds and message templates.

**Note:** A formal in-app approval or rejection workflow for disputed credits is out of scope for v1. The proprietor's review mechanism is the audit log. `[FIX-19]`

**Permissions:**

| Action | Allowed |
|---|---|
| View everything — all student profiles, reports, audit logs, dashboards | Yes |
| Create user accounts, fee structures, academic terms, installment presets, communication templates, debt rules | Yes |
| Edit all system configuration, user roles, templates, installment plans | Yes |
| Deactivate users and fee structures (soft delete only — no hard deletes) | Yes |
| Export all reports and exports available to bursar and accountant | Yes |

---

## 5. Functional Requirements

### Module A: Authentication and RBAC

---

#### A1 — Email and Password Login

Users log in with their registered email and password. The system validates credentials against the hashed password in the database and issues a session token via NextAuth.js. Login attempts are rate-limited to 5 per minute per IP address.

**Acceptance criteria:**

1. A user with a valid email and correct password is logged in and redirected to their role-specific dashboard within 2 seconds.
2. A user with an incorrect password receives a generic error message ("Invalid email or password") with no indication of which field is wrong.
3. After 5 failed login attempts from the same IP within 60 seconds, the system returns a 429 response and blocks further attempts for 15 minutes.
4. Session expires after 30 minutes of inactivity and the user is redirected to the login page.
5. All login events (success and failure) are recorded in the AuditLog with IP address, timestamp, and user ID if resolved.

**Priority:** P0

---

#### A2 — Password Reset

Any user can request a password reset. The system sends a time-limited reset link to the registered email address via Resend.

**Acceptance criteria:**

1. Submitting a registered email sends a reset link that expires after 30 minutes.
2. Submitting an unregistered email returns the same success message to prevent email enumeration.
3. The reset link can only be used once. A second click returns an error.
4. Password reset is logged in the AuditLog.

**Priority:** P0

---

#### A3 — Role-Based Route Protection

Every page and API endpoint enforces role-based access. A user who navigates directly to a restricted URL is redirected to their own dashboard with no data exposed.

**Acceptance criteria:**

1. A PARENT navigating to `/bursar/students` receives a 403 redirect to `/parent/dashboard`.
2. An ACCOUNTANT navigating to `/bursar/post-fees` receives a 403 redirect.
3. tRPC procedures return `UNAUTHORIZED` if called by a role without permission, with no data in the response body.

**Priority:** P0

---

#### A4 — Parent Account Creation and Student Linking `[FIX-2: new module — this was the most critical gap in v1.0]`

The bursar creates parent accounts. Parents do not self-register. This eliminates the child-verification problem and ensures every parent account is linked to a verified student record before access is granted.

**Account creation flow:**

1. The bursar navigates to the parent management screen and clicks "Create Parent Account."
2. The bursar enters the parent's first name, last name, email address, and phone number (optional).
3. The system creates a User record with role = PARENT and isActive = true.
4. The system sends an invite email via Resend to the parent's email address. The email contains a one-time invite link. The link expires after 48 hours.
5. The parent clicks the link, is taken to a password-setup page, enters and confirms their password, and is logged in for the first time.
6. If the invite link expires before the parent uses it, the bursar can re-send the invite from the parent management screen. Re-sending generates a new link and invalidates the old one.

**Student linking flow:**

1. The bursar opens a parent's profile page and clicks "Link Student."
2. The bursar selects one or more students from a searchable dropdown (by student name or admission number).
3. The system creates a `ParentStudentLink` record for each selected student.
4. The linked students appear immediately on the parent's profile view in the portal.
5. A parent can be linked to multiple students. A student can be linked to multiple parents (e.g., mother and father with separate accounts).
6. Unlinking a student from a parent is a soft action: the `ParentStudentLink` record is deactivated, not deleted. The audit log records who removed the link and when.

**Acceptance criteria:**

1. A parent receives an invite email within 60 seconds of account creation.
2. The invite link expires in 48 hours and can only be used once.
3. A parent who has not accepted their invite is shown as "Pending" in the parent management screen. The bursar can re-send the invite.
4. A parent cannot access the portal until they have set their password via the invite link.
5. The bursar can link or unlink students from a parent account at any time.
6. All parent account creation and student linking actions are logged in the AuditLog.

**Priority:** P0

---

### Module B: Student Financial Profile

---

#### B1 — Bursar View: Full Student Financial Profile

Every student has a dedicated profile page accessible to the bursar, accountant (read-only), and proprietor. The page is the single source of truth for that student's financial history.

**Balance calculation specification** `[FIX-1]`

The outstanding balance displayed on the student profile and used in all reports and the debtor list is computed as follows:

```
Outstanding Balance =
    SUM(FeePosting.amount WHERE type = CHARGE)
  − SUM(FeePosting.amount WHERE type = REVERSAL)
  − SUM(Payment.amount WHERE status = SUCCESS AND studentId = this student)
  − SUM(ManualCredit.amount WHERE studentId = this student)
  − Student.creditBalance
```

This is computed dynamically per query. No cached balance field exists on the Student record (except `creditBalance`, which holds forward-carried overpayments). For the debtor list view (Module H), the balance for all students is pre-aggregated server-side in a single query before pagination, to avoid N+1 performance issues.

**Acceptance criteria:**

1. The page header displays: student photo (or placeholder avatar), full name, admission number, and current class.
2. A prominently styled balance card shows: total fees posted this term, total paid, and outstanding balance in NGN with comma formatting. The outstanding balance is computed using the formula above.
3. The fee posting table shows columns: Date, Description, Type (Charge / Reversal), Line Items, Amount, Posted By. Sorted by date descending. Paginated at 20 rows.
4. The payment history table shows columns: Date, Method, Amount, Reference Number, Recorded By. Sorted by date descending.
5. A fee waiver section shows any waivers applied: date, amount, reason, applied by.
6. If an installment plan is active, a plan status card shows: plan name, parts, amount per part, due dates, and which parts are paid, pending, or overdue.
7. An internal notes section shows timestamped notes visible only to BURSAR and PROPRIETOR.
8. A debt collection log shows all automated messages sent: date, channel, stage, and delivery status. Visible to BURSAR and PROPRIETOR only.
9. A "Record Cash Payment" button opens the manual credit modal (see Module D).

**Priority:** P0

---

#### B2 — Parent View: Simplified Financial Profile

Parents see a read-only, simplified version of each child's profile. No internal data is exposed.

**Acceptance criteria:**

1. Parent sees a tab or dropdown to switch between their linked children. All children appear under the same login.
2. The profile shows: outstanding balance, fee breakdown by line item for the current term, and payment history with receipt download links.
3. If an installment plan is active, the parent sees due dates and amounts for each installment.
4. No internal notes, debt collection logs, or admin controls appear in the parent view.
5. The parent cannot edit any data on this page.

**Priority:** P1

---

### Module C: Fee Structure and Posting

---

#### C1 — Define Fee Structure

Bursar or proprietor creates a fee structure per class per term. A structure contains named line items with amounts.

**Acceptance criteria:**

1. Creating a fee structure requires: structure name, class, academic term, and at least one line item with a label and NGN amount.
2. Line items can be marked as optional (e.g., bus fees).
3. The system calculates and displays the total structure amount automatically.
4. A fee structure can be deactivated but not deleted.
5. Creating a fee structure is logged in AuditLog.

**Priority:** P0

---

#### C2 — Post Fees to Students

Bursar posts a fee structure to individual students or in bulk to all students in a class.

**Acceptance criteria:**

1. Bursar selects a fee structure and chooses between "Post to individual student" or "Post to entire class."
2. Bulk posting to a class creates a FeePosting record (type = CHARGE) for each active student in that class.
3. Posted fees appear on the student profile immediately after posting.
4. System records: posted by (user ID), posted at (timestamp), fee structure ID.
5. Posting is logged in AuditLog with the list of student IDs affected.
6. **[FIX-9]** If a student already has a posting for the same fee structure and term, the system blocks the action entirely and returns an error: *"This fee structure has already been posted to [Student Name] for this term. Create a new fee structure if you need to post a supplementary charge."* No override or confirmation bypass is permitted. This prevents accidental duplicate charges.
7. **[FIX-9]** Bulk posting to a class shows a confirmation screen before committing, listing: the class name, the number of active students affected, the fee structure name, and the total amount per student. The bursar must click "Confirm Post" to proceed.
8. A fee posting can be reversed by the proprietor within 24 hours of creation via the audit log. Reversals create a new FeePosting record with type = REVERSAL for each affected student. After 24 hours, the reverse action is disabled in the UI and a message is displayed: *"Contact your system administrator to reverse postings older than 24 hours."* `[FIX-4, FIX-9]`

**Priority:** P0

---

### Module D: Manual Cash Payment Crediting

---

#### D1 — Record Cash Payment

Bursar records a cash payment made in the office directly on the student profile. The action immediately reduces the outstanding balance and generates a printable receipt.

**Acceptance criteria:**

1. The manual credit modal collects: amount (NGN, required), payment date (date picker, required), description (text, required), reference note (text, optional).
2. **[FIX-6]** Amount must be a positive number greater than zero. If the amount exceeds the outstanding balance by more than ₦5,000, the system shows a warning: *"This payment exceeds the outstanding balance by [amount]. Please confirm this is correct and enter a reason."* A reason field (required) appears. The transaction is saved only after the bursar provides a reason. The transaction is flagged with `isSensitive: true` in the AuditLog and a notification is sent to the proprietor's email.
3. **[FIX-6]** Overpayments are recorded as a credit balance on the student account. The surplus is stored in `Student.creditBalance` and applied automatically against the student's next fee posting. No cash refunds are processed through SchoolFin.
4. On save, the outstanding balance on the student profile updates in real time without a page refresh.
5. On save, the system generates a receipt with the following fields: school name and logo, receipt number (auto-incremented, format: RCP-YYYY-NNNNNN), student full name, admission number, class, amount paid (NGN formatted), date of payment, payment method (Cash), name of bursar who recorded it, and a QR code containing a verification URL (see criterion 7).
6. The receipt is rendered as a print-optimised view (A5 size) that the bursar can print directly from the browser via `react-to-print`.
7. **[FIX-10]** The QR code on every receipt encodes the URL: `https://[school-domain]/verify/receipt/[receiptNumber]`. This public endpoint returns: student first name only, amount paid, date of payment, and school name. No further PII is exposed. No authentication is required to access this endpoint. This allows any party (parent, auditor, third party) to verify that a receipt is genuine.
8. The transaction is recorded in `ManualCredit` and `Payment` tables and logged in AuditLog with `isSensitive: true`.
9. The bursar can reprint the receipt at any time from the student payment history.
10. **[FIX-25]** If a duplicate cash payment is detected — defined as: same `studentId`, same `amount`, same `recordedById`, same calendar day — the system shows a warning containing the existing payment's timestamp and receipt number. The bursar must confirm with a typed reason before saving. The confirmed transaction is flagged `isSensitive: true` in the AuditLog.

**Priority:** P0

---

### Module E: Online Payment Processing

---

#### E1 — Parent-Initiated Online Payment

Parents initiate payments through the Flutterwave payment popup embedded in the portal. On successful payment, the student account is credited automatically.

**Acceptance criteria:**

1. The parent selects a child, sees the outstanding balance, and clicks "Pay Now."
2. The Flutterwave inline popup opens with the amount pre-filled to the outstanding balance. Parent can reduce the amount but cannot pay more than the balance.
3. Supported channels: card, bank transfer, USSD.
4. On payment success, Flutterwave sends a webhook to `/api/webhooks/flutterwave`. The system verifies the webhook signature using the Flutterwave secret hash before processing.
5. On verified webhook receipt, the system creates a Payment record (status: SUCCESS), updates the student balance, creates a Receipt record, and queues a payment confirmation notification to the parent.
6. On payment failure, the system creates a Payment record (status: FAILED) and queues a failure notification to the parent.
7. All webhook events are logged in AuditLog with the raw payload stored in metadata.
8. **[FIX-12]** The parent can download the receipt as a PDF from their payment history. If the receipt PDF has not yet been generated (`fileUrl` is null on the Receipt record), the payment history shows a *"Receipt generating — check back in a moment"* status with an auto-refresh every 15 seconds. Once `fileUrl` is populated, the download link appears. The target is that receipt PDFs are available within 60 seconds of payment completion under normal load.
9. **[FIX-18]** A partial payment made without selecting an installment plan reduces the outstanding balance. The account is treated as partially paid. No special status is assigned. The debt collection engine evaluates the remaining balance against the term `paymentDueDate` for automated reminders, the same as any other overdue account.

**Priority:** P1

---

### Module F: Installment Payment Plans

---

#### F1 — Create Installment Plan Preset

Bursar or proprietor creates reusable installment plan templates. Parents cannot create plans; they select from available presets.

**Acceptance criteria:**

1. Creating a plan requires: plan name, number of installments (2 to 6), and a description of the split (e.g., "50% deposit, 25% mid-term, 25% end of term").
2. A plan can be activated or deactivated. Deactivated plans are not shown to parents.
3. Multiple active plans can exist simultaneously.

**Priority:** P1

---

#### F2 — Parent Selects Installment Plan

During payment, a parent can choose to pay via an installment plan instead of full payment.

**Acceptance criteria:**

1. If active installment plans exist, the payment screen shows a "Pay by Installment" option listing available plans.
2. Selecting a plan shows the parent the exact NGN amounts and due dates for each installment based on the student's outstanding balance.
3. On confirming the plan, the system creates Installment records for each part and records the plan selection.
4. **[FIX-3]** The first installment payment is collected immediately via Flutterwave. At the time of this first payment, the system requests Flutterwave to tokenise the parent's card. The returned card token is stored encrypted (AES-256) in the `Installment.cardToken` field. This token is used for automatic future installment charges. If Flutterwave does not return a token (e.g., the parent paid via bank transfer or USSD rather than card), the `cardToken` field is left null and subsequent installments require the parent to initiate payment manually from the portal. The plan status screen will show a "Pay Now" button for each upcoming installment when no token is available.

**Priority:** P1

---

#### F3 — Installment Tracking and Failure Handling

BullMQ jobs monitor installment due dates and handle failures.

**Acceptance criteria:**

1. 48 hours before an installment due date, the system sends a reminder notification to the parent.
2. **[FIX-3b]** Before retrying a failed installment charge, the system sends the parent a notification (Email and SMS) 24 hours in advance, stating the amount that will be retried and the retry date. The message reads: *"Your installment payment of [amount] failed. We will retry this charge on [date]. Please ensure sufficient funds are available, or log in to pay manually."*
3. On a failed installment payment, if a card token is available, the system retries the charge automatically 48 hours after the failure notification is sent.
4. After 3 consecutive failed attempts on the same installment, the system sets `isFlagged: true` on the Installment record and sends a notification to the bursar.
5. Flagged installments appear highlighted on the student profile and in the debtor list.

**Priority:** P1

---

### Module G: Automated Debt Collection Engine

---

#### G1 — Configure Debt Collection Rules

Bursar or proprietor sets the trigger rules for automated reminders. Rules are configured per academic term.

**Acceptance criteria:**

1. The configuration UI allows creating up to 3 rules per term: REMINDER, ESCALATION, and FINAL_NOTICE.
2. Each rule requires: stage (enum), days overdue (integer — measured from the term's `paymentDueDate`), and a linked communication template.
3. Rules can be toggled active or inactive without deleting them.

**Priority:** P2

---

#### G2 — Automated Message Sending

BullMQ cron job runs daily and identifies overdue accounts that match active debt collection rules. It sends messages via Email and SMS.

**Acceptance criteria:**

1. The cron job runs at 08:00 WAT every weekday.
2. For each student with an outstanding balance, the job calculates days overdue from `AcademicTerm.paymentDueDate`. If no `paymentDueDate` is set on the active term, the debt collection engine logs a configuration warning to Sentry, skips the term, and does not send messages. `[FIX-5]`
3. If days overdue match a rule threshold (within +/- 1 day tolerance), the job sends the message via the rule's template and channel.
4. The job does not send a message if the student account has automated messages paused (`isPaused` flag on the account).
5. Each sent message is recorded as a `DebtCollectionEvent` on the student profile, including the `ruleId` of the rule that triggered it. `[FIX-8]`
6. The message body substitutes template variables: `{{studentFirstName}}`, `{{outstandingBalance}}`, `{{dueDate}}`, `{{paymentLink}}`.
7. **[FIX-8]** If the same rule (matched by `ruleId`) has already fired for the same student within 7 days, the system skips and does not double-send. Deduplication is scoped to the specific rule, not just the stage, so that updating a rule's template mid-term does not suppress legitimate sends.

**Priority:** P2

---

#### G3 — Pause Automated Messages per Student

Bursar can pause automated messages for a specific student account when a manual arrangement has been made.

**Acceptance criteria:**

1. The student profile shows a toggle: "Automated messages: Active / Paused."
2. Pausing records the action in AuditLog with the bursar's user ID and timestamp.
3. While paused, no automated debt messages are sent for that student.
4. The bursar can resume at any time. Resume is also logged.

**Priority:** P2

---

### Module H: Debtor List and Filters

---

#### H1 — Debtor List View

A full list of students with any outstanding balance. Accessible to Bursar, Accountant, and Proprietor.

**Acceptance criteria:**

1. The list loads within 2 seconds for up to 500 student records.
2. Default view shows all students with balance > 0 for the current active term, sorted by outstanding balance descending. Outstanding balance is computed using the formula defined in Module B1.
3. Each row shows: student name, class, total fees posted, total paid, outstanding balance (NGN), days overdue, and payment plan status.
4. Filter panel provides: class (dropdown), academic term (dropdown), outstanding balance range (min/max NGN inputs), days overdue range (min/max), payment plan status (all / on plan / not on plan), and last payment date range.
5. **[FIX-17]** All filtering is server-side. Filter changes trigger a debounced API query (300ms debounce) that returns the filtered result set from the server. A loading indicator is shown during the query. The full unfiltered debtor list is never loaded into the client browser. This ensures consistent performance regardless of dataset size.
6. Bursar can select multiple rows via checkbox and click "Send Reminder" to trigger a manual one-off notification to selected parents.

**Priority:** P2

---

#### H2 — Export Debtor List to Excel

**Acceptance criteria:**

1. A "Export to Excel" button exports the currently filtered debtor list.
2. The exported file includes columns: Student Name, Admission Number, Class, Term, Total Fees (NGN), Amount Paid (NGN), Balance Outstanding (NGN), Days Overdue, Payment Plan Status, Last Payment Date.
3. The file is generated by ExcelJS, named `SchoolName_DebtorList_YYYYMMDD.xlsx`, and downloads in the browser within 5 seconds for up to 500 rows.
4. Column headers are bold. Currency columns are formatted as `#,##0.00`.

**Priority:** P2

---

### Module I: Reporting and Excel Export

---

#### I1 — School Income Report

A summary financial report showing fees posted, collected, and outstanding. Filterable by term, class, and date range.

**Acceptance criteria:**

1. Report header shows: school name, report date, filter parameters applied.
2. Summary row shows totals: Total Fees Posted (NGN), Total Collected (NGN), Total Outstanding (NGN), Collection Rate (%).
3. Breakdown table shows the same metrics per class.
4. Secondary breakdown shows totals by payment method (Cash, Card, Bank Transfer, USSD).
5. Report updates within 3 seconds of changing filter parameters.

**Priority:** P2

---

#### I2 — Tax Auditor Excel Export

**Acceptance criteria:**

1. Export button on the income report page triggers the export. While the export is generating, the UI shows a loading spinner and disables the export button with text "Generating…". `[FIX-16]`
2. Sheet 1 (Summary): school name, term, date range, total fees, total collected, total outstanding, collection rate.
3. Sheet 2 (Fee Income Detail): one row per payment. Columns: Date, Student Name, Admission Number, Class, Payment Method, Amount (NGN), Reference Number, Recorded By.
4. Sheet 3 (Outstanding Balances): one row per student with any outstanding balance. Columns: Student Name, Admission Number, Class, Total Fees, Paid, Outstanding.
5. All currency cells formatted as NGN `#,##0.00`. All date cells formatted as `DD/MM/YYYY`.
6. File named `SchoolName_FinancialReport_TermName_YYYYMMDD.xlsx`.
7. File generates and downloads in under 30 seconds for a full academic year's data. A server-side timeout of 25 seconds applies. `[FIX-16]`
8. **[FIX-16]** If the export exceeds the 25-second timeout, the job is handed off to a BullMQ worker (`generate-tax-export` queue). The user sees a message: *"Your export is taking longer than expected. We will email it to you within 5 minutes."* The file is emailed to the requesting user's email address as an attachment when complete.

**Priority:** P2

---

### Module J: Audit Logging and Compliance

---

#### J1 — Append-Only Audit Log

**Acceptance criteria:**

1. Every create, update, or status-change action writes an AuditLog record.
2. AuditLog records contain: `userId`, `action` (e.g., `MANUAL_CREDIT_CREATED`), `entity` (e.g., `ManualCredit`), `entityId`, `metadata` (JSON payload of changed fields), `isSensitive` (boolean), `createdAt`.
3. **[FIX-7]** The database service account is granted INSERT and SELECT privileges on the AuditLog table only. UPDATE and DELETE are not granted at the database level, making records immutable after creation. There is no application-layer API to modify or delete AuditLog records.
4. Sensitive actions (`MANUAL_CREDIT_CREATED`, `PAYMENT_REFUNDED`, `USER_ROLE_CHANGED`, `FEE_WAIVER_APPLIED`, `OVERPAYMENT_OVERRIDE`) are flagged with `isSensitive: true`.
5. Proprietor can view the audit log filtered by date, user, or entity type.

**Priority:** P2

---

#### J2 — NDPA Compliance

**Acceptance criteria:**

1. All PII (names, email, phone) stored in the database is encrypted at rest using the hosting provider's native disk encryption. Sensitive columns (phone numbers, email addresses) are additionally encrypted at the application layer using AES-256 before writing to the database.
2. The system does not store Flutterwave card data. Card data is handled entirely by Flutterwave's PCI-DSS compliant infrastructure. Flutterwave card tokens (used for installment auto-charging) are stored encrypted with AES-256 in the application database. `[FIX-3c]`
3. Parents can request deletion of their account data. The proprietor can initiate this from the admin panel, which anonymises PII fields while retaining financial records for legal compliance.
4. The school's privacy policy URL is displayed on the login page and in notification emails.
5. Data is not shared with third parties beyond Flutterwave (payments), Termii (SMS), and Resend (email), each governed by their own compliance certifications.

**Priority:** P2

---

### Module K: Notification System

---

#### K1 — Notification Delivery

**Acceptance criteria:**

1. Payment confirmation: the initial send is triggered within 60 seconds of a successful payment via both Email and SMS. `[FIX-24]` The 60-second target applies to the first send attempt only. If the first attempt fails, BullMQ retries with exponential backoff (1 min, 5 min, 15 min). Guaranteed delivery time is not SLA'd beyond the first attempt.
2. Payment failure alert: sent to parent within 60 seconds of a failed Flutterwave webhook (first attempt).
3. Installment due reminder: sent 48 hours before the due date.
4. Debt collection messages: sent according to configured rules (see Module G).
5. Manual cash payment receipt: receipt link emailed to parent when the bursar records a cash payment (if parent email is on file).
6. All sent notifications are recorded in the Notification table with status (QUEUED, SENT, FAILED).
7. Failed notifications are retried up to 3 times with exponential backoff via BullMQ.
8. SMS messages sent via Termii. Email messages sent via Resend.
9. **[FIX-25]** If a notification fails on all retry attempts and no fallback channel exists (e.g., the parent has no phone number on file and SMS cannot be used as a fallback), the Notification record is marked FAILED and an in-app alert is shown to the bursar on their next dashboard load. The alert reads: *"[Student Name]'s parent could not be reached — [notification type] delivery failed. No fallback channel is available. Please contact the parent directly."*

**Priority:** P2

---

### Module L: Receipt Verification (Public Endpoint) `[FIX-10: new module]`

---

#### L1 — Public Receipt Verification

A public, unauthenticated endpoint that allows any party to verify that a SchoolFin receipt is genuine.

**Acceptance criteria:**

1. The endpoint is available at: `GET /verify/receipt/[receiptNumber]`
2. The endpoint requires no authentication.
3. On a valid receipt number, the endpoint returns: student first name (only), amount paid, date of payment, school name, and payment method.
4. On an invalid or unknown receipt number, the endpoint returns a 404 with the message: *"Receipt not found. If you believe this is an error, contact the school."*
5. No sensitive data is exposed: no last name, no admission number, no class, no email, no phone.
6. All QR codes on printed and digital receipts encode the URL for this endpoint using the receipt's unique receipt number.
7. The endpoint is rate-limited to 60 requests per IP per minute to prevent scraping.

**Priority:** P0

---

## 6. Technical Requirements

### 6.1 Authentication and Session Security

- NextAuth.js with Credentials provider for email/password login.
- Passwords hashed with bcrypt, minimum 12 salt rounds.
- JWT sessions stored in HTTP-only, Secure, SameSite=Strict cookies.
- Session token rotated on every request (rolling sessions).
- Session duration: 30 minutes idle timeout, 8-hour absolute maximum.
- Redis used as the NextAuth.js session store via `@auth/redis-adapter`.
- All session creation and destruction events written to AuditLog.
- CSRF protection enabled via NextAuth.js built-in CSRF token.

---

### 6.2 RBAC Permission Matrix

| **Action** | **PARENT** | **BURSAR** | **ACCOUNTANT** | **PROPRIETOR** |
|---|---|---|---|---|
| View own student profile | Yes | Yes | Yes | Yes |
| View all student profiles | No | Yes | Yes | Yes |
| View internal notes | No | Yes | No | Yes |
| View debt collection log | No | Yes | No | Yes |
| View audit log | No | No | No | Yes |
| Post fees (individual) | No | Yes | No | Yes |
| Post fees (bulk by class) | No | Yes | No | Yes |
| Record manual cash credit | No | Yes | No | Yes |
| Make online payment | Yes | No | No | No |
| Create installment plan preset | No | Yes | No | Yes |
| Select installment plan | Yes | No | No | No |
| Pause automated messages | No | Yes | No | Yes |
| Add internal note | No | Yes | No | Yes |
| Export debtor list | No | Yes | Yes | Yes |
| Export income report | No | Yes | Yes | Yes |
| Export tax audit file | No | No | Yes | Yes |
| Manage user accounts | No | No | No | Yes |
| Configure fee structures | No | Yes | No | Yes |
| Configure academic terms | No | No | No | Yes |
| Configure debt rules | No | Yes | No | Yes |
| Configure message templates | No | Yes | No | Yes |
| Apply fee waiver | No | Yes | No | Yes |
| Download own receipts | Yes | No | No | No |
| Reprint any receipt | No | Yes | No | Yes |
| Create parent accounts | No | Yes | No | Yes |
| Link/unlink students to parents | No | Yes | No | Yes |

---

### 6.3 tRPC Router Structure

The API is organised into the following tRPC routers. All procedures enforce role guards via middleware before executing.

- `auth.login`, `auth.logout`, `auth.resetPassword`, `auth.changePassword`
- `students.getById`, `students.getAll`, `students.create`, `students.update`, `students.linkParent`
- `fees.createStructure`, `fees.updateStructure`, `fees.postToStudent`, `fees.postToClass`, `fees.getStructures`
- `payments.initiateOnline`, `payments.getByStudent`, `payments.getReceipt`
- `manualCredits.create`, `manualCredits.getByStudent`, `manualCredits.getReceipt`
- `installments.createPlan`, `installments.getPlans`, `installments.selectPlan`, `installments.getByStudent`
- `debtCollection.createRule`, `debtCollection.getRules`, `debtCollection.togglePause`, `debtCollection.getEventLog`
- `notifications.getByStudent`, `notifications.sendManualReminder`
- `reports.getIncomeReport`, `reports.exportDebtorList`, `reports.exportTaxAudit`
- `auditLog.getAll` (PROPRIETOR only)
- `users.create`, `users.update`, `users.deactivate`, `users.resendInvite` (PROPRIETOR and BURSAR)
- `terms.create`, `terms.setActive`, `terms.getAll`
- `parents.create`, `parents.getAll`, `parents.linkStudent`, `parents.unlinkStudent` `[FIX-2: new router]`
- **Public (no auth):** `receipts.verify` — serves the `/verify/receipt/[receiptNumber]` endpoint `[FIX-10: new router]`

---

### 6.4 Flutterwave Webhook Handling

- Webhook endpoint: `POST /api/webhooks/flutterwave`
- Every incoming request is verified by comparing the `verif-hash` header against the Flutterwave secret hash stored in environment variables. Requests with invalid hashes return 401 immediately with no processing.
- Verified webhook payloads are written to a Redis queue (BullMQ) for async processing. The endpoint returns 200 to Flutterwave immediately to prevent timeout retries.
- The BullMQ worker processes the payload: looks up the Payment by `flutterwaveRef`, updates status, credits the student account, creates a Receipt, and queues the parent notification.
- Idempotency: if a webhook arrives with a `flutterwaveRef` that already has status SUCCESS, the worker discards the duplicate without reprocessing.
- Supported events: `charge.completed` (success), `charge.failed`, `refund.completed`.
- All raw webhook payloads stored in AuditLog metadata for debugging.

---

### 6.5 BullMQ Job Queue Design

| **Queue Name** | **Job Type** | **Schedule / Trigger** | **Retry Policy** | **On Final Failure** |
|---|---|---|---|---|
| `notifications` | `send-email` | Triggered on event | 3 retries, exponential backoff (1 min, 5 min, 15 min) | Mark Notification FAILED, alert Sentry, in-app alert to bursar if no fallback channel |
| `notifications` | `send-sms` | Triggered on event | 3 retries, exponential backoff | Mark Notification FAILED, alert Sentry, in-app alert to bursar if no fallback channel |
| `debt-collection` | `run-debt-scan` | Cron: 08:00 WAT Mon–Fri | No retry (cron reschedules) | Alert Sentry, log to AuditLog |
| `installments` | `check-due-installments` | Cron: 07:00 WAT daily | No retry | Alert Sentry |
| `installments` | `retry-failed-installment` | Triggered 48 hrs after failure notification | 1 retry only | Flag installment, notify bursar |
| `payments` | `process-flw-webhook` | Triggered by webhook receipt | 3 retries | Alert Sentry, log raw payload |
| `receipts` | `generate-receipt-pdf` | Triggered on payment success | 2 retries | Mark Receipt `fileUrl` as null, log error, parent sees "generating" state |
| `payments` | `poll-pending-payments` | Cron: every 15 minutes | 1 retry | Alert Sentry, log to AuditLog |
| `reports` | `generate-tax-export` | Triggered on 25-second timeout from synchronous attempt | 1 retry | Email user with error message |

> **`poll-pending-payments` job specification `[FIX-11]`:** This job queries the Flutterwave API for any `Payment` record in the SchoolFin database with `status = PENDING` and `createdAt` older than 10 minutes. For each such payment, the job calls the Flutterwave verify-transaction endpoint. If Flutterwave confirms the transaction as successful, the job updates the payment status to SUCCESS, credits the student account, creates a Receipt record, and queues the parent confirmation notification. This job is the fallback for cases where the initial webhook was not delivered.

---

### 6.6 Data Encryption

- All data in transit encrypted via TLS 1.2 minimum. HTTPS enforced on all routes. HTTP requests redirected to HTTPS.
- PostgreSQL database encrypted at rest using the hosting provider's native disk encryption (Supabase or Neon both provide this by default).
- Sensitive columns (phone numbers, email addresses) additionally encrypted at the application layer using AES-256 before writing to the database, using a key stored in environment variables, not in the database.
- **[FIX-3c]** Flutterwave card tokens stored in `Installment.cardToken` are encrypted at the application layer using AES-256 before writing to the database. The encryption key is stored in environment variables only.
- Flutterwave secret hash and API keys stored in environment variables only, never committed to the repository.
- Receipt PDF files stored in Cloudinary or S3 with signed URLs that expire after 1 hour.

---

### 6.7 Rate Limiting and Abuse Prevention

- Login endpoint: 5 attempts per IP per 60 seconds. Block for 15 minutes on breach.
- Password reset: 3 requests per email address per hour.
- Flutterwave payment initiation: 10 requests per parent session per hour.
- API-wide rate limit: 200 requests per IP per minute via middleware on all tRPC routes.
- Webhook endpoint rate limit: 500 requests per minute (Flutterwave can batch retries).
- Receipt verification endpoint (`/verify/receipt/[receiptNumber]`): 60 requests per IP per minute. `[FIX-10]`
- Rate limiting implemented via `upstash/ratelimit` with Redis backend.

---

### 6.8 NDPA Compliance

- A Privacy Notice is displayed at registration and linked in the footer and all outgoing emails.
- The school's Privacy Policy document is uploaded by the proprietor and linked from the portal.
- PII fields (name, email, phone) are encrypted at the application layer as described in 6.6.
- Data retention policy: financial records retained for 7 years (Nigerian tax law requirement). Student PII can be anonymised after the student leaves the school upon parent request.
- No PII is shared with third parties other than: Flutterwave (payment processing), Termii (SMS delivery), Resend (email delivery). Each is covered by their own DPA and is compliant.
- The system logs all data access events involving PII in AuditLog.
- A data breach response plan must be documented by the school before launch (provided as a template in the handover documentation).

---

### 6.9 Receipt Generation `[FIX-12]`

**Environment:** Receipt PDF generation is executed by the BullMQ worker process running on Railway or Render, not on the Next.js/Vercel server function. Puppeteer with `@sparticuz/chromium` is used on the worker server. Vercel serverless functions do not run Puppeteer.

Manual cash payment receipts are generated using `react-to-print` for in-browser printing (bursar-side, no PDF file stored). Online payment receipts are generated as PDF using Puppeteer on the worker server and stored in Cloudinary/S3 with a signed URL.

**Receipt layout specification (A5, portrait, 148mm × 210mm):**

- **Header zone (top 30mm):** school logo (left, max 40mm wide), school name in bold 14pt, school address in 9pt, school phone in 9pt.
- **Divider:** 1pt horizontal rule.
- **Receipt title:** "OFFICIAL PAYMENT RECEIPT" centred, 12pt bold.
- **Receipt metadata (2-column table):** Receipt No | RCP-YYYY-NNNNNN, Date | DD/MM/YYYY, Payment Method | Cash / Card / Bank Transfer / USSD.
- **Student details (2-column table):** Student Name, Admission No, Class.
- **Payment details table:** Description | Amount (NGN). One row per fee line item if known, or a single row "School Fees Payment." Total row in bold.
- **Footer zone:** "Recorded by: [Bursar Full Name]", QR code (right-aligned, 20mm × 20mm) encoding the receipt verification URL (see Module L1), "This is an official receipt. Keep for your records." in 8pt italic.
- For online payments, the receipt also shows the Flutterwave transaction reference.

---

### 6.10 Backup and Disaster Recovery

- PostgreSQL: automated daily backups via Supabase or Neon with 30-day retention. Point-in-time recovery (PITR) enabled.
- Redis: persistence configured with RDB snapshots every 15 minutes and AOF logging.
- File storage (Cloudinary/S3): cross-region replication enabled. Receipts and documents are immutable once written.
- Recovery Time Objective (RTO): 4 hours for full system restoration from backup.
- Recovery Point Objective (RPO): 24 hours maximum data loss (daily backup window).
- Monthly restoration drill: the builder performs a test restore from backup to a staging environment every 30 days and documents the result.

---

## 7. Business Model

### 7.1 One-Time Build Fee

The one-time build fee covers the full delivery of the configured SchoolFin instance for the client school. Scope of delivery includes:

- Complete deployment of all Phase 0 through Phase 2 features as defined in this PRD.
- Configuration of school-specific settings: school name, logo, academic term dates, initial fee structures, user accounts for proprietor and bursar, Flutterwave account integration, Termii SMS sender ID, and Resend email domain.
- Data migration: if the school has an existing Excel fee register, the builder imports historical student and payment data into the system (up to the current academic year).
- User acceptance testing with the bursar and proprietor.
- One round of post-launch bug fixes within 30 days of go-live.
- Handover documentation: admin guide, bursar user guide, and parent quick-start guide.

---

### 7.2 Annual Maintenance Retainer

The annual retainer covers ongoing operations after the first year. It includes:

- Hosting costs: Vercel, Railway/Render, Supabase/Neon, Cloudinary.
- Third-party service subscriptions: Resend email, Termii SMS credits.
- **[FIX-15]** The SMS credit volume included in the retainer is defined per deployment in the commercial agreement and stored as a system configuration variable: `SMS_MONTHLY_CAP`. The proprietor's dashboard displays the current month's SMS usage against this cap. When usage exceeds 80% of the cap, the proprietor receives an email alert. When usage reaches 100% of the cap, automated SMS sending is paused and the bursar receives an in-app notification reading: *"Monthly SMS limit reached. Automated SMS messages are paused. Contact your system administrator to top up credits."* Overage usage is billed separately at the agreed per-SMS rate.
- Security updates and dependency patching on a monthly release cycle.
- Up to 8 hours of feature requests or configuration changes per year.
- Bug fixes for issues not caused by school-side user error.
- Annual backup restoration test and report.
- Phone and email support for the bursar and proprietor during school hours.

---

### 7.3 Reusable Template Strategy

The codebase is structured from v1 so that each new school deployment requires only configuration changes, not code changes. The following elements are externalised into a single `.env` file and a `school.config.ts` file committed to a per-school branch:

- `SCHOOL_NAME`, `SCHOOL_LOGO_URL`, `SCHOOL_ADDRESS`, `SCHOOL_PHONE`
- `SCHOOL_TIMEZONE` (default: `Africa/Lagos`)
- `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_SECRET_HASH`
- `TERMII_API_KEY`, `TERMII_SENDER_ID`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_DOMAIN`
- `DATABASE_URL`, `REDIS_URL`
- `DEFAULT_CURRENCY` (default: `NGN`)
- `ACADEMIC_TERM_STRUCTURE` (3-term or 2-semester, configured at setup)
- `SMS_MONTHLY_CAP` (agreed per-school, set at deployment) `[FIX-15]`

A new deployment follows this process: clone the main template branch, create a school-specific branch, fill in the config file, run database migrations, seed the proprietor account, and deploy. Estimated setup time per new school: 3 to 5 working days including data migration.

---

## 8. Risks and Mitigations

| **Risk** | **Likelihood** | **Impact** | **Mitigation** |
|---|---|---|---|
| Flutterwave webhook delivery failure — Flutterwave fails to deliver the payment success webhook, leaving a parent's account uncredited after a successful charge. | M | H | The `poll-pending-payments` BullMQ job (Section 6.5) runs every 15 minutes and reconciles any Payment record stuck in PENDING status older than 10 minutes by calling the Flutterwave verify API. Bursar can also manually trigger a reconciliation check from the admin panel. `[FIX-11]` |
| Termii SMS delivery failure in Nigeria — SMS messages not delivered due to carrier routing issues or DND registrations. | H | M | Log all failed SMS deliveries. Fall back to email if the parent has an email address on file. If both channels fail, show in-app alert to bursar (see Module K1). Provide the bursar with a manual reminder option from the debtor list. Monitor delivery rates. |
| Bursar records a cash payment twice by accident — duplicate manual credits inflate a student's paid balance. | M | H | **[FIX-25]** On saving a manual credit, the system checks for an existing credit matching: same `studentId`, same `amount`, same `recordedById`, same calendar day. If a match is found, the system shows a warning with the existing payment's timestamp and receipt number, and requires the bursar to type a reason before proceeding. All manual credits are flagged `isSensitive` in AuditLog for proprietor review. |
| School loses internet access — the portal becomes inaccessible during a payment collection day. | M | H | Provide the bursar with a downloadable offline CSV of the current debtor list at the start of each week. Payments can be recorded manually and entered into the system when connectivity returns. Investigate offline-first PWA for Phase 3. |
| Parent data breach — unauthorised access to parent contact details or payment history. | L | H | PII encrypted at application layer. HTTP-only cookies. Rate limiting on login. Signed receipt URLs with 1-hour expiry. Annual penetration test included in the maintenance retainer. |
| School fails to pay the annual maintenance retainer — builder is unable to fund ongoing hosting. | M | M | Retainer invoiced 60 days before expiry. A 30-day grace period applies before the system is suspended. The contract specifies that the school owns its data and the builder provides a full database export before suspension. |
| Fee structure posted in error to wrong class. | M | H | Bulk posting shows a confirmation screen listing the number of students affected and the class name before committing. **[FIX-9]** Duplicate postings of the same structure to the same student are blocked entirely — no override. The proprietor can reverse a bulk posting within 24 hours via the audit log. After 24 hours, the reverse button is disabled and the builder must be contacted for manual reversal. `[FIX-9]` |
| Flutterwave pricing or API changes break payment flow. | L | H | Abstract the Flutterwave integration behind a `PaymentGateway` service interface. This allows swapping to an alternative provider (e.g., Paystack) with changes confined to one module. Monitor Flutterwave developer changelog monthly. |
| BullMQ Redis failure causes missed debt collection messages. | L | M | Redis configured with AOF persistence to minimise data loss. The debt collection cron logs its run results to PostgreSQL independently of Redis. If Redis is unavailable, the cron job logs a Sentry error and the bursar is notified to send manual reminders. |
| Installment card token not available for auto-charge — parent paid first installment by bank transfer or USSD, no token returned. | M | M | **[FIX-3]** If no card token is available, subsequent installments are not auto-charged. The parent's installment plan status screen shows a "Pay Now" button for each upcoming installment, and reminder notifications are sent as normal. The bursar's debtor list shows these accounts clearly so the bursar can follow up. |

---

## 9. Prisma Data Model

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  PARENT
  BURSAR
  ACCOUNTANT
  PROPRIETOR
}

enum PaymentMethod {
  CASH
  CARD
  BANK_TRANSFER
  USSD
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
  REFUNDED
}

enum NotificationChannel {
  EMAIL
  SMS
  WHATSAPP
}

enum NotificationStatus {
  QUEUED
  SENT
  FAILED
}

enum DebtStage {
  REMINDER
  ESCALATION
  FINAL_NOTICE
}

// [FIX-4] Added FeePostingType enum to support reversals
enum FeePostingType {
  CHARGE
  REVERSAL
}

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  hashedPassword String
  role           Role
  firstName      String
  lastName       String
  phone          String?  // encrypted at application layer (AES-256)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // parentLinks is only populated for Role.PARENT users.
  // Application layer enforces this constraint.
  // Future: extract ParentProfile to a separate table in v2. [FIX: data model note]
  parentLinks  ParentStudentLink[]
  feePostings  FeePosting[]
  manualCredits ManualCredit[]
  auditLogs    AuditLog[]
  notes        StudentNote[]

  @@index([email])
  @@index([role])
}

model Student {
  id              String   @id @default(cuid())
  admissionNumber String   @unique
  firstName       String
  lastName        String
  class           String
  photoUrl        String?
  isActive        Boolean  @default(true)
  // [FIX-6] creditBalance holds surplus from overpayments, applied to next term's fee posting
  creditBalance   Decimal  @default(0) @db.Decimal(12, 2)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  parentLinks   ParentStudentLink[]
  feePostings   FeePosting[]
  payments      Payment[]
  manualCredits ManualCredit[]
  installments  Installment[]
  debtEvents    DebtCollectionEvent[]
  notifications Notification[]
  notes         StudentNote[]
  receipts      Receipt[]

  @@index([admissionNumber])
  @@index([class])
}

model ParentStudentLink {
  id           String   @id @default(cuid())
  parentId     String
  studentId    String
  relationship String   @default("Parent")
  isActive     Boolean  @default(true) // soft-delete: set false on unlink
  createdAt    DateTime @default(now())

  parent  User    @relation(fields: [parentId], references: [id])
  student Student @relation(fields: [studentId], references: [id])

  @@unique([parentId, studentId])
  @@index([parentId])
  @@index([studentId])
}

model AcademicTerm {
  id   String @id @default(cuid())
  name String

  startDate DateTime
  endDate   DateTime
  // [FIX-5] paymentDueDate is the anchor for the debt collection engine.
  // Must be set by the proprietor when creating the term.
  // If null, the debt collection engine logs a warning and skips this term.
  paymentDueDate DateTime?

  isActive  Boolean  @default(false)
  createdAt DateTime @default(now())

  feeStructures FeeStructure[]
  feePostings   FeePosting[]
  installments  Installment[]
  debtRules     DebtCollectionRule[]

  @@index([isActive])
}

model FeeStructure {
  id          String  @id @default(cuid())
  name        String
  class       String
  termId      String
  totalAmount Decimal @db.Decimal(12, 2)
  isActive    Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  term      AcademicTerm  @relation(fields: [termId], references: [id])
  lineItems FeeLineItem[]
  postings  FeePosting[]

  @@index([class])
  @@index([termId])
}

model FeeLineItem {
  id             String  @id @default(cuid())
  feeStructureId String
  label          String
  amount         Decimal @db.Decimal(12, 2)
  isOptional     Boolean @default(false)

  feeStructure FeeStructure @relation(fields: [feeStructureId], references: [id])

  @@index([feeStructureId])
}

model FeePosting {
  id             String         @id @default(cuid())
  studentId      String
  termId         String
  feeStructureId String
  description    String
  amount         Decimal        @db.Decimal(12, 2)
  // [FIX-4] type distinguishes normal charges from reversals.
  // Reversals carry a positive amount; the balance formula subtracts them.
  type           FeePostingType @default(CHARGE)
  postedById     String
  postedAt       DateTime       @default(now())

  student      Student      @relation(fields: [studentId], references: [id])
  term         AcademicTerm @relation(fields: [termId], references: [id])
  feeStructure FeeStructure @relation(fields: [feeStructureId], references: [id])
  postedBy     User         @relation(fields: [postedById], references: [id])

  @@index([studentId])
  @@index([termId])
  @@index([postedAt])
  @@index([type])
}

model Payment {
  id             String        @id @default(cuid())
  studentId      String
  amount         Decimal       @db.Decimal(12, 2)
  method         PaymentMethod
  status         PaymentStatus @default(PENDING)
  flutterwaveRef String?       @unique
  internalRef    String        @unique @default(cuid())
  channel        String?
  paidAt         DateTime?
  createdAt      DateTime      @default(now())
  installmentId  String?

  student     Student      @relation(fields: [studentId], references: [id])
  installment Installment? @relation(fields: [installmentId], references: [id])
  receipt     Receipt?

  @@index([studentId])
  @@index([status])
  @@index([flutterwaveRef])
  @@index([paidAt])
}

model InstallmentPlan {
  id            String   @id @default(cuid())
  name          String
  description   String?
  numberOfParts Int
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  installments Installment[]
}

model Installment {
  id             String   @id @default(cuid())
  studentId      String
  planId         String
  termId         String
  partNumber     Int
  amountDue      Decimal  @db.Decimal(12, 2)
  dueDate        DateTime
  paidAt         DateTime?
  failedAttempts Int      @default(0)
  isFlagged      Boolean  @default(false)
  isPaused       Boolean  @default(false)
  // [FIX-3] cardToken stores the Flutterwave tokenised card reference for auto-charging.
  // Encrypted at application layer (AES-256) before storage.
  // Null if the parent's first payment was made via bank transfer or USSD.
  cardToken      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  student  Student         @relation(fields: [studentId], references: [id])
  plan     InstallmentPlan @relation(fields: [planId], references: [id])
  term     AcademicTerm    @relation(fields: [termId], references: [id])
  payments Payment[]

  @@index([studentId])
  @@index([dueDate])
  @@index([isFlagged])
}

model ManualCredit {
  id            String   @id @default(cuid())
  studentId     String
  amount        Decimal  @db.Decimal(12, 2)
  description   String
  referenceNote String?
  recordedById  String
  recordedAt    DateTime @default(now())
  receiptId     String?  @unique

  student     Student  @relation(fields: [studentId], references: [id])
  recordedBy  User     @relation(fields: [recordedById], references: [id])
  receipt     Receipt? @relation(fields: [receiptId], references: [id])

  @@index([studentId])
  @@index([recordedAt])
}

model Receipt {
  id            String        @id @default(cuid())
  receiptNumber String        @unique
  studentId     String
  paymentId     String?       @unique
  manualCreditId String?      @unique
  amount        Decimal       @db.Decimal(12, 2)
  method        PaymentMethod
  issuedAt      DateTime      @default(now())
  // fileUrl is null while PDF generation is in progress.
  // The parent UI shows a "generating" state when fileUrl is null.
  fileUrl       String?

  student      Student       @relation(fields: [studentId], references: [id])
  payment      Payment?      @relation(fields: [paymentId], references: [id])
  manualCredit ManualCredit?

  @@index([studentId])
  @@index([receiptNumber])
  @@index([issuedAt])
}

model DebtCollectionRule {
  id         String    @id @default(cuid())
  termId     String
  stage      DebtStage
  daysOverdue Int
  templateId String
  isActive   Boolean   @default(true)
  createdAt  DateTime  @default(now())

  term     AcademicTerm          @relation(fields: [termId], references: [id])
  template CommunicationTemplate @relation(fields: [templateId], references: [id])

  // [FIX-8] DebtCollectionEvents reference this rule via ruleId for correct deduplication
  events DebtCollectionEvent[]

  @@unique([termId, stage])
  @@index([termId])
}

model CommunicationTemplate {
  id        String              @id @default(cuid())
  name      String
  channel   NotificationChannel
  subject   String?
  body      String
  variables String[]
  isActive  Boolean             @default(true)
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt

  rules DebtCollectionRule[]

  @@index([channel])
}

model DebtCollectionEvent {
  id        String              @id @default(cuid())
  studentId String
  // [FIX-8] ruleId scopes deduplication to the specific rule, not just the stage.
  // This prevents mid-term rule template updates from incorrectly suppressing sends.
  ruleId    String
  stage     DebtStage
  channel   NotificationChannel
  message   String
  sentAt    DateTime            @default(now())
  status    NotificationStatus  @default(QUEUED)

  student Student            @relation(fields: [studentId], references: [id])
  rule    DebtCollectionRule @relation(fields: [ruleId], references: [id])

  @@index([studentId])
  @@index([ruleId])
  @@index([sentAt])
}

model Notification {
  id        String              @id @default(cuid())
  studentId String
  channel   NotificationChannel
  type      String
  subject   String?
  body      String
  status    NotificationStatus  @default(QUEUED)
  sentAt    DateTime?
  createdAt DateTime            @default(now())

  student Student @relation(fields: [studentId], references: [id])

  @@index([studentId])
  @@index([status])
  @@index([createdAt])
}

model StudentNote {
  id        String   @id @default(cuid())
  studentId String
  authorId  String
  content   String
  createdAt DateTime @default(now())

  student Student @relation(fields: [studentId], references: [id])
  author  User    @relation(fields: [authorId], references: [id])

  @@index([studentId])
}

model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  action      String
  entity      String
  entityId    String
  metadata    Json?
  isSensitive Boolean  @default(false)
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  // [FIX-7] Database service account has INSERT and SELECT on this table only.
  // UPDATE and DELETE are not granted at the database level.
  // Records are immutable after creation.

  @@index([userId])
  @@index([entity, entityId])
  @@index([createdAt])
  @@index([isSensitive])
}
```

---

## 10. Success Metrics

| **Metric** | **Baseline** | **Target** | **Measurement Method** | **Time Frame** |
|---|---|---|---|---|
| % of term fee transactions recorded in SchoolFin (online or cash) | 0% | 100% | Total portal transactions / total fees posted per term | End of Term 1 post-launch |
| % of term fees paid online via Flutterwave | 0% | 40% | Flutterwave payments / total fees posted per term | End of Term 2 post-launch |
| Average outstanding balance per active student | **[FIX-20]** Must be manually captured from the school's pre-launch Excel records during onboarding. Builder is responsible for recording this figure before go-live. If baseline cannot be established, this metric is deferred to Term 2, with Term 1 data as the new baseline. | 40% reduction vs pre-launch baseline | Sum of all outstanding balances / active student count | End of Term 2 post-launch |
| Time to generate debtor list report | 2–3 hours (manual Excel) | Under 5 minutes | Timing from filter apply to export download | From launch |
| Parent portal login rate | 0% | 70% of linked parents log in at least once per term | Unique parent logins / total parent accounts per term | End of Term 1 post-launch |
| **[FIX-21b]** Parent online payment rate | 0% | 40% of linked parents make at least one Flutterwave payment per term | Parents with ≥1 online payment / total parent accounts | End of Term 2 post-launch |
| SMS notification delivery rate | N/A | 95% or above | Sent / (Sent + Failed) per Termii delivery reports | Ongoing from Phase 2 |
| Email notification delivery rate | N/A | 98% or above | Sent / (Sent + Failed) per Resend delivery reports | Ongoing from Phase 2 |
| System uptime during fee-payment windows (first 2 weeks of term) | N/A | 99.5% | Vercel and Railway uptime monitoring, Sentry error rate | Ongoing from launch |
| Tax audit Excel export generation time | 2–5 days (manual) | Under 30 seconds for full year's data | Timing from export click to file download | From Phase 2 |
| Manual cash receipt print time | N/A | Under 3 seconds | Timing on manual credit save | From Phase 0 |
| Bursar manual reminder actions per week | Unknown | 60% reduction after Phase 2 automation goes live | Count of manual vs automated reminder sends | End of Phase 2 |

---

## 11. Assumptions

1. Single-school deployment per instance. No multi-tenancy.
2. All monetary values in Nigerian Naira (NGN).
3. Payment gateway is Flutterwave.
4. The bursar is the primary power user. The system is designed around their workflow first.
5. Parents get a simplified read-only financial view per child.
6. A parent with multiple children sees all children under one login via `ParentStudentLink`.
7. Manual cash credits by the bursar generate a printable receipt immediately on save.
8. Installment plan options are preset by the school. Parents can only select, not create or modify.
9. Failed installment: send pre-retry notification 24 hours before retry; retry at 48 hours after failure; flag account after 3 consecutive failures. `[FIX-3b]`
10. Debt collection engine uses Email and SMS in Phase 1 and 2. WhatsApp deferred to Phase 3.
11. Bursar can pause automated messages per student account at any time.
12. Accountant is read-only with export rights only. No write access.
13. Excel export uses ExcelJS library.
14. Data compliance under Nigeria Data Protection Act (NDPA).
15. Business model is one-time build fee plus annual maintenance retainer. No SaaS or transaction fees.
16. The codebase is a reusable template from v1. New school deployments require only configuration changes, not code changes.
17. The school operates a 3-term academic year. If the school uses a 2-semester system, the `AcademicTerm` model accommodates this via configuration without code changes.
18. The school has a maximum of 1,000 active students. System performance targets are set at this scale. Schools with more than 1,000 students may require database query optimisation before deployment.
19. **[FIX-22]** Each student is enrolled in exactly one class at a time. Mid-term class transfers require the bursar to manually reverse the existing fee posting for the old class (creating a REVERSAL `FeePosting` record) and post the correct fee structure for the new class. No automated fee adjustment is triggered by a class change in the student record.
20. The bursar has a reliable internet connection at the school office. The system does not have an offline mode in v1.
21. Receipt numbers are globally sequential within a deployment instance, not per-student. Format: RCP-YYYY-NNNNNN where NNNNNN is a zero-padded auto-increment.
22. The school uses one Flutterwave account. Payments from parents are made directly to the school's Flutterwave merchant account. The builder does not handle or hold any funds.
23. All staff users (bursar, accountant, proprietor) are created by the proprietor or the builder during setup. There is no self-registration for staff.
24. Fee waivers are recorded as manual credits by the bursar with "Fee Waiver" as the description. No separate waiver approval workflow exists in v1.
25. **[FIX-2b]** The receipt archive covers payments recorded in SchoolFin only. Payments made before system launch are not retroactively digitised unless the bursar manually enters historical records as manual credits.
26. **[FIX-19]** The proprietor's review of sensitive manual credits is passive — via the audit log — with no in-app approval or rejection workflow in v1. A formal dispute workflow is deferred to a future version.
27. **[FIX-5]** Each academic term must have a `paymentDueDate` set before the debt collection engine can operate. If this date is not set, the engine skips the term and logs a warning. Setting the payment due date is part of the term creation workflow.
28. **[FIX-6]** Overpayments are held as a credit balance on the student account (`Student.creditBalance`) and applied automatically against the student's next fee posting. No cash refunds are processed through SchoolFin.

---

## 12. Phased Roadmap

### Phase 0 — Foundation

**Features:**
- Authentication: email/password login, password reset, session management, route protection.
- Role setup: PARENT, BURSAR, ACCOUNTANT, PROPRIETOR with full RBAC enforcement.
- **Parent account creation and student linking module (Module A4).** `[FIX-2]`
- Student management: create, edit, deactivate students. Link students to parent accounts.
- Student financial profile (bursar view): balance display using specified formula, fee posting history (with type field), payment history, notes section.
- Fee structure management: create and manage fee structures with line items per class and term.
- Fee posting: post fees to individual students or bulk by class. Duplicate posting blocked.
- Manual cash payment crediting with printable receipt generation and QR code verification link.
- **Public receipt verification endpoint (Module L1).** `[FIX-10]`
- Basic proprietor dashboard: total students, total fees posted, total collected this term.
- Academic term management: create terms, set active term, set payment due date. `[FIX-5]`
- User account management (proprietor): create and deactivate bursar and accountant accounts.
- Audit logging for all P0 actions.

**Team:** 1 full-stack developer (Next.js, tRPC, Prisma, PostgreSQL), 1 UI/UX designer (part-time)

**Duration:** 6 to 8 weeks

**Dependencies:** PostgreSQL database live, Redis live, NextAuth.js configured.

**Key risks:** Fee posting bulk operation performance if student count is high. Mitigate with database index on class field.

---

### Phase 1 — Payments

**Features:**
- Flutterwave integration: inline payment popup, webhook handler, payment status updates.
- **`poll-pending-payments` BullMQ job for webhook fallback.** `[FIX-11]`
- Online payment flow for parents: select child, view balance, pay full or select installment plan.
- **Flutterwave card tokenisation on first installment payment. Encrypted token storage.** `[FIX-3]`
- Installment plan presets: bursar creates and manages plan templates.
- Parent selects installment plan during payment.
- Installment tracking per student: due dates, amounts, paid/pending/overdue status.
- **Pre-retry notification to parent 24 hours before failed installment retry.** `[FIX-3b]`
- Receipt generation for online payments: PDF via Puppeteer on Railway/Render worker, stored in Cloudinary/S3. `[FIX-12]`
- **Receipt pending UI state when `fileUrl` is null.** `[FIX-12]`
- Parent portal view: simplified student financial profile, payment history, downloadable receipts.
- Payment confirmation notifications (Email and SMS) on successful payment.
- Failed payment notification to parent.
- **In-app bursar alert when notification delivery fails with no fallback channel.** `[FIX-25]`

**Team:** 1 full-stack developer, 1 QA tester (part-time)

**Duration:** 4 to 6 weeks

**Dependencies:** Flutterwave account credentials from the school. Termii and Resend accounts configured. Phase 0 complete.

**Key risks:** Flutterwave webhook reliability. Mitigated by `poll-pending-payments` job. Test thoroughly in Flutterwave sandbox before go-live. Verify Flutterwave tokenisation API availability on the school's Flutterwave plan before building the auto-charge flow.

---

### Phase 2 — Automation

**Features:**
- Automated debt collection engine: configurable rules per term (using `paymentDueDate`), BullMQ cron job, template-based messaging.
- Debt collection rule configuration UI for bursar and proprietor.
- Communication template editor with variable substitution preview.
- Per-student message pause toggle on the student profile.
- **Debt collection event log with `ruleId` field on all events.** `[FIX-8]`
- Debtor list view with full server-side filter panel. `[FIX-17]`
- Bulk manual reminder action from the debtor list.
- Excel export of debtor list via ExcelJS.
- School income report with filters.
- Tax auditor Excel export (3-sheet format) with loading state and timeout fallback to BullMQ worker. `[FIX-16]`
- **`SMS_MONTHLY_CAP` dashboard widget and alert system for proprietor.** `[FIX-15]`
- Full audit log viewer for the proprietor.
- NDPA compliance features: privacy notice, data anonymisation on request.
- Sentry and PostHog integration for monitoring and analytics.

**Team:** 1 full-stack developer, 1 QA tester (part-time)

**Duration:** 5 to 7 weeks

**Dependencies:** Phase 1 complete. BullMQ and Redis production configuration verified.

**Key risks:** BullMQ cron reliability in production environment. Test on Railway/Render specifically, as some platforms throttle cron workers.

---

### Phase 3 — Scale

**Features:**
- WhatsApp notifications via a WhatsApp Business API provider (360dialog or Twilio). `[FIX-13]`
- Mobile money payment support via Flutterwave (M-Pesa, Airtel Money).
- Advanced analytics dashboard for proprietor: revenue trends, collection rate by class, term-over-term comparison.
- **Validate and document the multi-school deployment process with a second live client school. Verify that all school-specific config is fully externalised to `.env` and `school.config.ts` with no code changes required.** `[FIX-23]`
- Optional: offline-first capability for the bursar's debtor list (PWA with service worker caching).
- API hook documentation for future SIS integration (no build, documentation only).

**Team:** 1 full-stack developer, 1 QA tester (part-time)

**Duration:** 6 to 8 weeks

**Dependencies:** Phase 2 complete. WhatsApp Business API approval (can take 2 to 4 weeks from Meta). Second school client identified for template validation.

**Key risks:** WhatsApp Business API approval delay. Mitigate by starting the approval process during Phase 2.

---

## 13. Open Questions

The following questions from v1.0 have been closed by decisions made in this version:

| # | Question | Resolution |
|---|---|---|
| 2 | What is the exact payment due date logic? | `paymentDueDate` is a per-term field set by the proprietor at term creation. The debt engine uses this date. If unset, engine skips and warns. (Section 6.5, Module G2, Assumption 27) |
| 6 | Do parents self-register or does the bursar create accounts? | Bursar creates all parent accounts and sends invite links. Parents do not self-register. (Module A4) |
| 7 | What happens with overpayments? | Surplus is stored in `Student.creditBalance` and applied to the next fee posting. No cash refunds via SchoolFin. (Module D1, Assumption 28) |

The following questions remain open and must be resolved before or during Phase 0:

1. **What is the school's Flutterwave merchant account status?** Is it already active, or does the school need to go through Flutterwave's KYC and onboarding process? This could add 2 to 4 weeks to the Phase 1 timeline.

3. **Does the school want to charge parents a convenience fee for online payments** (e.g., to offset Flutterwave's transaction fees)? If yes, a fee markup field is needed in the payment flow.

4. **What historical data needs to be migrated?** Does the school have a digital record (Excel) of student balances and payment history, or does the system start fresh at the beginning of the next term? The pre-launch outstanding balance figure (Assumption from Section 10) must be captured at this stage.

5. **How should the system handle a student who changes class mid-term?** The assumption (Assumption 19) is that the bursar manually reverses the old posting and creates a new one. Confirm this matches the school's expectation.

8. **For the installment plan, when a parent selects a plan, does the system charge the first installment immediately via Flutterwave, or does it record the plan and expect the parent to initiate payment manually?** The current spec (Module F2, AC4) states immediate charge. Confirm.

9. **Does the proprietor want a separate VIEW_ONLY role** for a school administrator (e.g., a secretary who needs to look up student balances but not export reports)? If yes, a fifth role must be defined before Phase 0 schema is locked.

10. **What Termii plan and monthly SMS credit volume does the school expect?** This determines the `SMS_MONTHLY_CAP` value in the commercial agreement and must be agreed before Phase 2 launch.

---

*— End of PRD v1.1 —*

*Document prepared following structured review of v1.0. All 25 lapses identified in review have been addressed. Every change is tagged with its fix reference number for traceability.*
