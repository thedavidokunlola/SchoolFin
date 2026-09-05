---
trigger: always_on
---

# scope-boundaries.md

> 🔴 Building any item on the Non-Goals list is a failed task, regardless of how small or easy it seems.

---

## Non-Goals for v1

These are explicitly out of scope. Do not build them. Do not stub them. Do not scaffold them. Do not suggest implementing them as an improvement.

| Item | Status | Notes |
|---|---|---|
| Multi-school or multi-tenant architecture | Out of scope permanently for v1 | Each deployment serves exactly one school. No shared database, no tenant routing. |
| Student academic records, grades, attendance | Out of scope permanently | SchoolFin is a fee management system only. |
| Payroll, staff salaries, school budget management | Out of scope permanently | |
| Parent-to-parent communication or school announcements | Out of scope permanently | |
| Native mobile apps (iOS or Android) | Out of scope permanently for v1 | Web-responsive only. |
| WhatsApp notifications | Phase 3 only | Do not build in Phase 0, 1, or 2. |
| Mobile money payments | Phase 3 only | Scoped to Phase 3 via Flutterwave. |
| SIS integration (build) | Phase 3 documentation only | API hooks are documented in Phase 3. Nothing is built. |
| In-app scholarship/waiver approval workflow | Out of scope for v1 | Bursars apply waivers as manual credits. No approval flow. |
| Automated bank reconciliation | Out of scope for v1 | |
| Direct school bank account integration | Out of scope for v1 | |
| Formal dispute approve/reject buttons | Out of scope for v1 | Proprietor reviews via audit log only. |
| A fifth user role (VIEW_ONLY, SECRETARY, etc.) | Unresolved open question | Do not add until client confirms. See PRD §13-Q9. |
| Convenience fee markup for online payments | Unresolved open question | Do not add until client confirms. See PRD §13-Q3. |
| Offline mode for v1 | Out of scope for v1 | Optional Phase 3 feature only. |
| Historical data migration tooling | Out of scope for agent | Builder handles manually during deployment. |

---

## What "Out of Scope" Means for the Agent

🔴 **Do not build a non-goal feature even if:**
- It seems small or simple.
- It seems like a natural extension of a feature you are already building.
- A user story or acceptance criterion could be loosely interpreted to include it.
- You believe it would be useful.

🔴 **If a task description could be interpreted to include a non-goal feature, stop and ask for clarification before building.**

---

## Single-School Constraint

🔴 **This is a single-school deployment. Every piece of code must assume exactly one school.**

Specifically:
- No `schoolId` foreign key on any model (unless explicitly added for a documented reason).
- No tenant routing, subdomain routing, or organisation-level filtering.
- All school-specific configuration (name, logo, timezone, etc.) is in `school.config.ts` — not in the database as a `School` model row.
- No query ever filters by `schoolId` because there is only one school per deployment.

_(PRD §Assumption 1)_

---

## Currency Constraint

🔴 **All monetary amounts are in Nigerian Naira (NGN).**  
There is no multi-currency support. There is no currency selector. There is no exchange rate logic.  
`DEFAULT_CURRENCY=NGN` in `school.config.ts`. _(PRD §Assumption 2)_

---

## Web-Only Constraint

🔴 **SchoolFin is a web application. There are no native mobile apps in v1.**  
The UI must be responsive (works on mobile browsers) but there is no React Native, Expo, or native mobile codebase. _(PRD §3 Non-Goals)_