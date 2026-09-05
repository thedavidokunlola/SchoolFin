---
trigger: glob
globs:
  - "src/app/**"
  - "src/server/**"
  - "prisma/schema.prisma"
---

# performance-requirements.md

> 🔴 These are acceptance criteria, not targets.  
> A feature that works correctly but misses a performance requirement is an incomplete feature.

---

## The Requirements

| Feature | Requirement | Measurement method |
|---|---|---|
| Login redirect | Complete within 2 seconds | From submit click to role-specific dashboard load |
| Debtor list load | Under 2 seconds for up to 500 student records | From page load to table populated |
| Debtor list filter | Returns results within 300ms debounce + server query | Debounce is 300ms; server query adds to that |
| Income report filter update | Within 3 seconds of changing filter parameters | From filter change to updated report displayed |
| Debtor list Excel export | Download starts within 5 seconds for up to 500 rows | From click to file download starting |
| Tax audit Excel export | Under 30 seconds for full academic year's data | From click to file download; 25-second server timeout |
| Online receipt PDF availability | Within 60 seconds of payment completion | From payment webhook confirmed to `fileUrl` populated |
| Manual cash receipt print | Under 3 seconds from save to print dialog | From "Save" click to browser print dialog appearing |

_(PRD §10, §H1-AC1, §H2-AC3, §I1-AC5, §I2-AC7, §E1-AC8)_

---

## Debtor List Performance Rules

🔴 **All filtering of the debtor list is server-side.**  
Filter changes trigger a debounced API query (300ms debounce). The full unfiltered debtor list is never loaded into the client browser.

🔴 **The debtor list uses server-side pagination.** Never load all records into memory and paginate in JavaScript.

🔴 **The balance for all students in the debtor list is pre-aggregated server-side in a single query before pagination.** No N+1 queries. _(PRD §B1)_

🔴 **The `Student.class` field has a database index.** This is defined in the Prisma schema (`@@index([class])`). Do not remove it. _(PRD §12 Phase 0 Key Risks)_

---

## Tax Audit Export Timeout Handling

🔴 **The tax audit export has a 25-second server-side timeout.**  
If the synchronous generation exceeds 25 seconds:
1. Hand off to the `generate-tax-export` BullMQ worker.
2. Show the user: _"Your export is taking longer than expected. We will email it to you within 5 minutes."_
3. The worker emails the completed file to the requesting user's email address.

🔴 **While the export is generating, the UI shows a loading spinner and the export button is disabled with text "Generating…".** _(PRD §I2-AC1)_

---

## Receipt PDF Pending State

🔴 **When `Receipt.fileUrl` is `null`, the parent's payment history shows a "generating" state with an auto-refresh poll every 15 seconds.**  
Once `fileUrl` is populated, the download link appears on the next poll. _(PRD §E1-AC8)_

---

## Database Indexes Required for Performance

🔴 **These indexes must exist and must not be removed:**

| Model | Index | Why |
|---|---|---|
| `Student` | `@@index([class])` | Bulk fee posting and debtor list class filter |
| `Student` | `@@index([admissionNumber])` | Student lookup by admission number |
| `Payment` | `@@index([status])` | `poll-pending-payments` job |
| `Payment` | `@@index([flutterwaveRef])` | Idempotency check on webhook |
| `Payment` | `@@index([paidAt])` | Income report date range filter |
| `FeePosting` | `@@index([studentId])` | Balance computation |
| `FeePosting` | `@@index([termId])` | Term-scoped queries |
| `AuditLog` | `@@index([createdAt])` | Audit log date filter |
| `AuditLog` | `@@index([isSensitive])` | Sensitive event filter |
| `Installment` | `@@index([dueDate])` | Due installment scan |
| `Installment` | `@@index([isFlagged])` | Flagged installment list |
| `DebtCollectionEvent` | `@@index([studentId])` | Per-student event history |
| `DebtCollectionEvent` | `@@index([ruleId])` | Deduplication check |

These match the Prisma schema in PRD §9 exactly. Do not remove any of them.