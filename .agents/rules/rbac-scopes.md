---
trigger: glob
globs:
  - "src/server/trpc/**"
  - "src/app/**"
---

# rbac-scopes.md

> This file supplements `rbac.md` with explicit rules for actions that the permission matrix alone does not make unambiguous.  
> 🔴 = hard requirement.

---

## Accountant — Read-Only With Export Rights

🔴 **The ACCOUNTANT role has no write access to any record.**  
The following are explicitly forbidden for ACCOUNTANT even though they might seem adjacent to reporting:
- Cannot create, update, or deactivate any `Student`, `User`, `FeeStructure`, or `AcademicTerm`.
- Cannot record a manual cash credit.
- Cannot post fees.
- Cannot modify installment plans.
- Cannot send notifications.

🔴 **ACCOUNTANT can view all student accounts (read-only) and all reports, and can export all reports.**  
The accountant's tRPC procedures are all `.query()` procedures or export triggers. No `.mutation()` procedure is accessible to ACCOUNTANT.

---

## Bursar — Cannot View the Audit Log

🔴 **The BURSAR role cannot access `auditLog.getAll` or any audit log view.**  
The audit log is visible to PROPRIETOR only. If a bursar navigates to an audit log URL, they receive a 403 redirect to `/bursar/dashboard`.

---

## Fee Posting Reversal — PROPRIETOR Only, 24-Hour Window

🔴 **Only the PROPRIETOR role can reverse a fee posting.**  
The reversal action must check:
1. The requesting user's role is PROPRIETOR.
2. The original `FeePosting.postedAt` is within 24 hours of the current time.

If either check fails, return an error. After 24 hours, the reverse button is disabled in the UI. The error message is:  
_"Contact your system administrator to reverse postings older than 24 hours."_

_(PRD §C2-AC8)_

---

## Academic Term Configuration — PROPRIETOR Only

🔴 **Only the PROPRIETOR role can:**
- Create academic terms (`terms.create`)
- Set the active term (`terms.setActive`)
- Set `paymentDueDate` on a term

The bursar cannot create or modify academic terms. _(PRD §6.2)_

---

## User Account Management — PROPRIETOR Only

🔴 **Only the PROPRIETOR role can:**
- Create bursar and accountant accounts (`users.create`)
- Deactivate user accounts (`users.deactivate`)
- Change user roles (`users.update` where role changes)

The bursar can create and manage parent accounts. The bursar cannot create, modify, or deactivate other staff accounts. _(PRD §6.2)_

---

## Sensitive Manual Credits — Proprietor Notification

🔴 **When a manual credit triggers the overpayment warning (>₦5,000 over balance):**
1. The BURSAR records the credit with a required reason.
2. The system flags `isSensitive: true` in AuditLog.
3. The system sends an email notification to the PROPRIETOR automatically.

The PROPRIETOR reviews via the audit log. There is no in-app approve/reject workflow. _(PRD §D1-AC2, §Assumption 26)_

---

## Parent — Own Children Only

🔴 **A PARENT can only view data for students linked to their account via an active `ParentStudentLink` record.**  
Every query returning student data for a PARENT must filter by `parentLinks.some({ parentId: parentUserId, isActive: true })`.

A PARENT cannot view another parent's linked students, even by guessing a student ID in the request.

---

## Internal Notes — BURSAR and PROPRIETOR Only

🔴 **`StudentNote` records are visible only to BURSAR and PROPRIETOR.**  
The PARENT view of the student profile must not include the notes section. The ACCOUNTANT view must not include the notes section. _(PRD §B2-AC4, §B1-AC7)_

---

## Debt Collection Log — BURSAR and PROPRIETOR Only

🔴 **The debt collection event log on the student profile is visible only to BURSAR and PROPRIETOR.**  
The PARENT view must not expose this log. The ACCOUNTANT view must not expose this log. _(PRD §B2-AC4)_

---

## Tax Audit Export — ACCOUNTANT and PROPRIETOR Only

🔴 **The tax audit Excel export is accessible only to ACCOUNTANT and PROPRIETOR.**  
The BURSAR cannot trigger `reports.exportTaxAudit`. _(PRD §6.2)_