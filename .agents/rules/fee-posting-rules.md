---
trigger: glob
globs:
  - "src/server/services/fees/**"
  - "src/server/trpc/router/fees*.ts"
  - "src/app/**/fees/**"
---

# fee-posting-rules.md

> 🔴 All rules here are hard requirements from PRD §C1, §C2, and §Assumption 19.

---

## Rule 1 — Duplicate Posting Is Blocked With No Override

🔴 **If a student already has a `FeePosting` record with the same `feeStructureId` and `termId`, the system blocks the action entirely.**

Return this exact error message:  
_"This fee structure has already been posted to [Student Name] for this term. Create a new fee structure if you need to post a supplementary charge."_

🔴 **No confirmation bypass. No admin override at the application layer. No second attempt.**  
The PROPRIETOR cannot override this block. The only way to add a supplementary charge is to create a new fee structure with a different `feeStructureId`.

_(PRD §C2-AC6)_

---

## Rule 2 — Bulk Posting Requires a Confirmation Screen

🔴 **Before committing a bulk class posting, the system shows a confirmation screen with:**
- The class name
- The number of active students affected
- The fee structure name
- The total amount per student

🔴 **The bursar must click "Confirm Post" to proceed.**  
The API endpoint that commits the posting must only be called after this confirmation. Never call it programmatically without the user-initiated confirm action.

_(PRD §C2-AC7)_

---

## Rule 3 — Bulk Posting Targets Active Students Only

🔴 **`Student.isActive = true` is always a condition in the bulk posting query.**  
Deactivated students are never included in a bulk class posting.

---

## Rule 4 — Reversals Create New Records; Never Modify Originals

🔴 **A fee posting reversal creates a new `FeePosting` record with `type = REVERSAL`.**  
The original `FeePosting` record with `type = CHARGE` is never updated, modified, or deleted.

The balance formula accounts for both `CHARGE` and `REVERSAL` types via the `computeOutstandingBalance` function.

_(PRD §C2-AC8)_

---

## Rule 5 — Reversal Window: 24 Hours, PROPRIETOR Only

🔴 **Reversals are only permitted within 24 hours of the original `FeePosting.postedAt` timestamp.**

🔴 **Only the PROPRIETOR role can perform a reversal.**

🔴 **After 24 hours:**
- The reverse action is disabled in the UI.
- The UI shows: _"Contact your system administrator to reverse postings older than 24 hours."_
- The `reversePosting` tRPC procedure returns an error if called with a posting older than 24 hours, regardless of UI state.

The server-side check is mandatory. Never rely on the UI alone to enforce the 24-hour window.

_(PRD §C2-AC8)_

---

## Rule 6 — Fee Structures Can Be Deactivated, Never Deleted

🔴 **No `FeeStructure` record is ever deleted.**  
Deactivation sets `FeeStructure.isActive = false`. The structure remains in the database and continues to be referenced by existing `FeePosting` records.

_(PRD §C1-AC4)_

---

## Rule 7 — Posting Is Recorded With Full Attribution

🔴 **Every `FeePosting` record must include:**
- `postedById` — the user ID of the bursar who posted it
- `postedAt` — the timestamp of posting (auto-set by Prisma `@default(now())`)
- `feeStructureId` — the structure that was posted

These fields cannot be null on a completed posting.

_(PRD §C2-AC4)_

---

## Rule 8 — Bulk Posting Is Logged With Student List

🔴 **The AuditLog entry for a bulk class posting includes the list of `studentId` values affected in `metadata`.**

```typescript
await writeAuditLog({
  userId: ctx.session.user.id,
  action: AUDIT_ACTIONS.FEE_POSTED_BULK,
  entity: "FeePosting",
  entityId: feeStructureId,
  metadata: {
    class: className,
    termId,
    feeStructureId,
    studentIds: affectedStudentIds,  // full list
    studentCount: affectedStudentIds.length,
  },
});
```

_(PRD §C2-AC5)_

---

## Rule 9 — Mid-Term Class Transfer Handling

🔴 **When a student changes class mid-term, no automatic fee adjustment occurs.**  
The bursar must:
1. Manually reverse the existing `FeePosting` for the old class (creates a `REVERSAL` record).
2. Post the correct fee structure for the new class (creates a new `CHARGE` record).

SchoolFin does not detect a class change on `Student.class` update and trigger any automatic action. _(PRD §Assumption 19)_