---
trigger: glob
globs:
  - "src/server/services/notifications/**"
  - "src/server/jobs/notifications*.ts"
  - "worker/**"
---

# notification-rules.md

> 🔴 All rules here are hard requirements from PRD §K1, §7.2, and §6.5.

---

## Rule 1 — Termii for SMS, Resend for Email. No Substitutions.

🔴 **SMS messages are sent exclusively via Termii.**  
🔴 **Email messages are sent exclusively via Resend.**  
No alternative providers. No fallback to a different provider on failure. If Termii is down, the message fails — do not reroute SMS through email (the fallback is the in-app bursar alert, not a provider swap).

_(PRD §K1-AC8)_

---

## Rule 2 — BullMQ Retry Policy

🔴 **Notification jobs use exactly 3 retries with exponential backoff: 1 minute, 5 minutes, 15 minutes.**  
This applies to both `send-email` and `send-sms` jobs.

After 3 failed attempts, the job is marked as failed and the `Notification` record status is set to `FAILED`.

_(PRD §6.5)_

---

## Rule 3 — On Final Failure With No Fallback Channel — In-App Bursar Alert

🔴 **If a notification fails on all 3 retry attempts and no fallback channel is available** (e.g., parent has no phone number on file and SMS cannot fall back to email), **show an in-app alert to the bursar on their next dashboard load.**

The alert text must say exactly:  
_"[Student Name]'s parent could not be reached — [notification type] delivery failed. No fallback channel is available. Please contact the parent directly."_

🔴 **The alert persists until the bursar dismisses it.**  
Store unread alerts in the database (or Redis), not in the application state. A bursar who logs out and back in must still see unread alerts.

_(PRD §K1-AC9)_

---

## Rule 4 — SMS Monthly Cap Enforcement

🔴 **Before every SMS send attempt, check the current month's SMS usage against `SMS_MONTHLY_CAP`.**

| Usage level | Action |
|---|---|
| < 80% of cap | Send normally |
| ≥ 80% and < 100% of cap | Send normally. Email the proprietor an alert about approaching cap. |
| ≥ 100% of cap | Do not send. Pause all automated SMS sending. Show in-app alert to bursar (see Rule 5). |

The SMS usage counter is stored in Redis, keyed by `sms:usage:{YYYY-MM}`. It resets at the start of each calendar month.

_(PRD §7.2)_

---

## Rule 5 — SMS Cap Reached Alert

🔴 **When SMS usage reaches 100% of `SMS_MONTHLY_CAP`:**
1. Pause all automated SMS sending.
2. Show the following in-app notification to the bursar:  
   _"Monthly SMS limit reached. Automated SMS messages are paused. Contact your system administrator to top up credits."_
3. Log the cap-reached event in AuditLog.

_(PRD §7.2)_

---

## Rule 6 — Notification Record Required for Every Send Attempt

🔴 **Every notification attempt (queued, sent, or failed) creates or updates a `Notification` record with:**
- `studentId`
- `channel` (EMAIL or SMS)
- `type` (e.g., `PAYMENT_CONFIRMATION`, `INSTALLMENT_REMINDER`, `DEBT_COLLECTION`)
- `subject` (for email)
- `body` (rendered message)
- `status` (QUEUED → SENT or FAILED)
- `sentAt` (on success)

_(PRD §K1-AC6)_

---

## Rule 7 — Payment Confirmation Timing

🔴 **Payment confirmation notifications (email and SMS) are triggered within 60 seconds of a successful payment webhook being processed.**  
The 60-second target applies to the first send attempt only. Retries follow the exponential backoff in Rule 2.

_(PRD §K1-AC1)_

---

## Rule 8 — Notification Types and Their Triggers

| Notification type | Trigger | Channel |
|---|---|---|
| Payment confirmation | Flutterwave `charge.completed` webhook processed | Email + SMS |
| Payment failure | Flutterwave `charge.failed` webhook processed | Email + SMS |
| Installment due reminder | 48 hours before installment due date | Email + SMS |
| Pre-retry notice | 24 hours before failed installment retry | Email + SMS |
| Debt collection message | Debt scan cron, rule threshold matched | Email + SMS |
| Manual cash receipt | Bursar records cash payment | Email (if parent email on file) |
| Invite email | Bursar creates parent account | Email only |

_(PRD §K1)_

---

## Rule 9 — WhatsApp Is Phase 3 Only

🔴 **Do not implement WhatsApp notifications in Phase 0, 1, or 2.**  
The `NotificationChannel.WHATSAPP` enum value exists in the schema but must not be used by any notification-sending code until Phase 3 is explicitly started. _(PRD §3 Non-Goals, §Assumption 10)_