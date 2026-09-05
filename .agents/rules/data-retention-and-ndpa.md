---
trigger: glob
globs:
  - "src/server/**"
  - "src/app/**"
---

# data-retention-and-ndpa.md

> 🔴 All rules here are hard requirements from PRD §6.8, §J2, and Nigerian tax law.

---

## Rule 1 — Financial Records Are Retained for 7 Years

🔴 **No financial record (`Payment`, `ManualCredit`, `FeePosting`, `Receipt`, `Installment`) may be deleted or anonymised.**  
These records must be retained for a minimum of 7 years from the date of creation, as required by Nigerian tax law.

This retention requirement applies even after a student leaves the school and even after a parent requests data deletion.

_(PRD §6.8)_

---

## Rule 2 — PII Anonymisation on Parent Request

🔴 **When a parent requests deletion of their account data, the PROPRIETOR initiates anonymisation from the admin panel.**  
Anonymisation overwrites PII fields with placeholder values. It does not delete records or break referential integrity.

**Fields anonymised on `User` (parent):**
- `firstName` → `"[Anonymised]"`
- `lastName` → `"[Anonymised]"`
- `email` → `"anonymised_{userId}@deleted.local"` (unique, avoids unique constraint violation)
- `phone` → `null`

**Fields anonymised on `Student` (linked children):**
- `firstName` → `"[Anonymised]"`
- `lastName` → `"[Anonymised]"`
- `photoUrl` → `null`

🔴 **All financial records linked to the student remain intact and unchanged.**  
`Payment`, `ManualCredit`, `FeePosting`, `Receipt`, and `Installment` records are preserved.

🔴 **The anonymisation action is logged in AuditLog with `action: AUDIT_ACTIONS.PII_ANONYMISED`, flagged `isSensitive: true`.**

_(PRD §6.8, §J2-AC3)_

---

## Rule 3 — Privacy Notice Display

🔴 **The school's privacy notice must be displayed or linked in:**
- The parent account setup page (first login after invite)
- The footer of all outgoing emails (link only)
- The login page footer (link only)

The privacy policy URL is stored in `school.config.ts` or set by the proprietor in the admin panel. Never hard-coded.

_(PRD §6.8, §J2-AC4)_

---

## Rule 4 — PII Shared Only With Named Third Parties

🔴 **Parent and student PII is shared with only these three third parties:**
- Flutterwave — for payment processing (name, amount)
- Termii — for SMS delivery (phone number, message body)
- Resend — for email delivery (email address, message body)

🔴 **No other third-party service receives PII.**  
Sentry error reports must not contain PII. PostHog analytics events must not contain PII. Scrub `User.email`, `User.phone`, `Student.firstName`, `Student.lastName` from all error and analytics payloads.

_(PRD §6.8, §J2-AC5)_

---

## Rule 5 — All PII Access Events Are Logged

🔴 **Every tRPC procedure or API endpoint that returns PII (name, email, phone) for a user other than the requesting user writes an AuditLog entry.**

This applies to:
- Bursar viewing a parent's contact details
- Accountant exporting a student list
- Proprietor viewing the user management screen
- Any export that contains student names or parent contact information

_(PRD §6.8)_

---

## Rule 6 — Data Breach Response Plan

🔴 **Before go-live, the school must have a documented data breach response plan.**  
The builder provides this as a template in the handover documentation. The plan does not need to be built into the application, but the handover documentation checklist must include it.

_(PRD §6.8)_

---

## Rule 7 — PII Is Encrypted at Application Layer

🔴 **`User.phone` and `User.email` are encrypted with AES-256 before any Prisma write.**  
See `encryption.md` for implementation details. This rule is restated here for NDPA compliance context: encryption of these fields is a legal compliance requirement under the Nigeria Data Protection Act, not merely a security preference.

_(PRD §J2-AC1)_

---

## Rule 8 — No Academic or Non-Financial Student Data

🔴 **SchoolFin stores no student academic records, grades, attendance, or any data not related to fee management.**  
Do not add fields to the `Student` model for academic performance. Do not add any feature that records non-financial student data, even if it seems adjacent (e.g., tracking which subjects a student studies to calculate variable fees — not in scope).

_(PRD §3 Non-Goals)_