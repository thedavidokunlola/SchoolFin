---
name: rbac-route-protection
description: >
  Load this skill when you hear: "add a page", "create a route", "protect this page",
  "add a dashboard", "build the bursar view", "add a parent page", "restrict access to",
  "add a modal that fetches data", "add a server component that queries".
  Applies to every file created inside src/app/(parent)/, src/app/(bursar)/,
  src/app/(accountant)/, src/app/(proprietor)/, and src/app/(auth)/.
---

## What this skill does
Teaches the ordered protocol for correctly protecting a new page route in SchoolFin.
The laws live in: `rbac.md`, `rbac-scopes.md`, PRD §6.2 (permission matrix),
PRD §A3 (role-based route protection), AGENTS.md §3 GROUP B (AUTH-1, AUTH-2, AUTH-9).
This skill does not restate those laws. It teaches the order to apply them.

---

## Procedure

### Step 1 — Look up the allowed roles in the PRD §6.2 permission matrix
Before writing any code, open PRD §6.2 and find the action this route serves.
Read the matrix row. Record which roles have "Yes".

Do not infer. Do not assume adjacency ("the bursar can post fees so they can probably
also reverse them"). The matrix is the complete and final authority per AUTH-2 in AGENTS.md.

Also check `rbac-scopes.md` for any exception or clarification on this action.
Several actions have rules in `rbac-scopes.md` that are not obvious from the matrix alone:
- Fee posting reversal → PROPRIETOR only, 24-hour window
- Academic term configuration → PROPRIETOR only
- User account management → PROPRIETOR only
- Tax audit export → ACCOUNTANT and PROPRIETOR only
- Audit log view → PROPRIETOR only
- Internal notes and debt collection log → BURSAR and PROPRIETOR only

### Step 2 — Place the route file in the correct folder group
The folder group determines the role context. Every route file lives inside
the folder that matches its primary role audience.
src/app/(auth)/ ← login, password reset, invite acceptance — no role required
src/app/(parent)/ ← PARENT role only
src/app/(bursar)/ ← BURSAR role only
src/app/(accountant)/ ← ACCOUNTANT role only
src/app/(proprietor)/ ← PROPRIETOR role only

If a page is accessible by more than one role (e.g., debtor list is BURSAR, ACCOUNTANT,
and PROPRIETOR), place it in the folder of the primary user and enforce the additional
roles via the middleware check in Step 3. Do not duplicate the page file.

### Step 3 — Apply session and role validation at the layout or page level
Use Next.js App Router server-side session checking at the layout level for the route group.
Every page in `(bursar)/` is protected by the `(bursar)` layout's session check.
Do not rely on client-side checks. The server must validate before rendering any data.

```typescript
// src/app/(bursar)/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BursarLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");                          // not authenticated at all
  }

  if (session.user.role !== "BURSAR" && session.user.role !== "PROPRIETOR") {
    redirect("/bursar/dashboard");               // wrong role — redirect to own dashboard
  }
  // Note: PROPRIETOR can access bursar routes — adjust the role check per Step 1

  return <>{children}</>;
}
```

### Step 4 — Map each role to its own dashboard redirect target
Per `rbac.md` Rule 3: an unauthorised user navigating to a restricted URL is redirected
to their own dashboard. Use this mapping for every redirect decision.

```typescript
const ROLE_DASHBOARDS = {
  PARENT:      "/parent/dashboard",
  BURSAR:      "/bursar/dashboard",
  ACCOUNTANT:  "/accountant/dashboard",
  PROPRIETOR:  "/proprietor/dashboard",
} as const;

// Use in any redirect:
redirect(ROLE_DASHBOARDS[session.user.role]);
```

### Step 5 — Ensure no data appears in the redirect response
Per PRD §A3-AC1 and `rbac.md` Rule 3: the redirect response must not include
any student data, financial data, or any page content.
A server component that fetches data and then redirects after the fetch is wrong —
redirect before any data fetch.

```typescript
// WRONG — data is fetched before the role is checked
export default async function BursarStudentsPage() {
  const students = await getStudents();        // ← fetched before auth check
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <StudentTable data={students} />;
}

// CORRECT — redirect before any data fetch
export default async function BursarStudentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "BURSAR" && session.user.role !== "PROPRIETOR") {
    redirect(ROLE_DASHBOARDS[session.user.role]);
  }
  const students = await getStudents();        // ← only reached after auth passes
  return <StudentTable data={students} />;
}
```

### Step 6 — For PARENT routes: add student data isolation to every query
Per `rbac.md` Rule 4 and `rbac-scopes.md` (Parent — Own Children Only):
every query that returns student data for a PARENT must filter by
`parentLinks.some({ parentId: session.user.id, isActive: true })`.

This filter is not optional and not the UI's responsibility. It must be in the
server-side query. A PARENT must not be able to see another parent's student
by guessing a student ID in the URL.

```typescript
// Every student query in a PARENT route must include this where clause
const students = await prisma.student.findMany({
  where: {
    parentLinks: {
      some: {
        parentId: session.user.id,      // session — never input
        isActive: true,
      },
    },
  },
  select: {
    id: true,
    firstName: true,
    // only fields the parent view needs — no internal notes, no debt log
  },
});
```

### Step 7 — Confirm the role is read from the session, never from input
Per `rbac.md` Rule 6 and AUTH-9 in AGENTS.md: the role is always `ctx.session.user.role`
or `session.user.role`. Never trust a role value in URL params, query strings, or request body.

```typescript
// WRONG — role from URL param
const { role } = params;
if (role === "BURSAR") { ... }

// CORRECT — role from session
const session = await getServerSession(authOptions);
const role = session.user.role;           // session is the source of truth
```

### Step 8 — Apply the same role check to every tRPC procedure the page calls
Route-level protection stops unauthorised page renders. It does not protect the API.
Every tRPC procedure called by this page must also have `requireRole()` applied.
Use the `trpc-procedure` skill for each procedure this page depends on.

A PARENT who is blocked from the bursar page can still call `fees.postToClass` directly
via the API if the procedure lacks a role guard. The page protection and the procedure
protection are both required and independent.

### Step 9 — Confirm no forbidden data appears in the PARENT view
Per `rbac-scopes.md`: the PARENT view must never expose:
- Internal notes (`StudentNote` records)
- Debt collection logs (`DebtCollectionEvent` records)
- Audit log data
- Other students not linked to this parent

Check every `select` clause in queries for PARENT routes against this list.
Omit these fields from the `select` — do not fetch them and then hide them in the UI.

---

## Code skeleton — multi-role page (BURSAR + PROPRIETOR + ACCOUNTANT)

```typescript
// src/app/(bursar)/debtors/page.tsx
// Accessible to BURSAR, ACCOUNTANT, PROPRIETOR per PRD §6.2
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

const ALLOWED_ROLES = ["BURSAR", "ACCOUNTANT", "PROPRIETOR"] as const;
type AllowedRole = typeof ALLOWED_ROLES[number];

const ROLE_DASHBOARDS = {
  PARENT:      "/parent/dashboard",
  BURSAR:      "/bursar/dashboard",
  ACCOUNTANT:  "/accountant/dashboard",
  PROPRIETOR:  "/proprietor/dashboard",
} as const;

export default async function DebtorListPage() {
  // Step 5: redirect before any data fetch
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (!ALLOWED_ROLES.includes(session.user.role as AllowedRole)) {
    redirect(ROLE_DASHBOARDS[session.user.role]);   // Step 4: own dashboard
  }

  // Only reached after auth passes
  // Step 7: role from session — never from params
  const userRole = session.user.role;

  return <DebtorListView role={userRole} />;
}
```

## Code skeleton — PARENT route with data isolation

```typescript
// src/app/(parent)/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";

export default async function ParentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "PARENT") {
    redirect(ROLE_DASHBOARDS[session.user.role]);
  }

  // Step 6: data isolation — parent sees only their linked students
  const students = await prisma.student.findMany({
    where: {
      parentLinks: {
        some: {
          parentId: session.user.id,    // Step 7: from session, never input
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      class: true,
      creditBalance: true,
      // Step 9: no StudentNote, no DebtCollectionEvent, no AuditLog
    },
  });

  return <ParentDashboard students={students} />;
}
```

---

## Traps

**Trap 1 — Fetching data before checking the session.**
A server component that queries the database and then redirects leaks query time
and risks leaking data if the redirect is conditional on the result.
Session check and role check always come first. Data fetch always comes after.

**Trap 2 — Relying on the folder group alone for protection.**
The `(bursar)` folder group does not automatically protect routes.
The layout or page must explicitly call `getServerSession` and redirect on failure.
The folder naming is organisational — it does not enforce auth by itself.

**Trap 3 — Redirecting to `/login` for a wrong-role user.**
A PARENT who navigates to `/bursar/students` is authenticated — they just have the
wrong role. Redirect them to `/parent/dashboard`, not `/login`.
Redirecting to `/login` logs them out of a valid session.

**Trap 4 — Missing the data isolation filter on PARENT queries.**
A PARENT who guesses a `studentId` in the URL must not see that student's data.
The filter `parentLinks.some({ parentId: session.user.id, isActive: true })` must be
in the Prisma query — not enforced only by the UI.

**Trap 5 — Exposing internal notes or debt collection logs in the PARENT view.**
`rbac-scopes.md` explicitly forbids these fields in the PARENT view.
Do not fetch them and hide them with a conditional — exclude them from the `select` clause.

**Trap 6 — Protecting the page but not the procedures it calls.**
Route protection and procedure protection are independent requirements.
An unprotected tRPC procedure is callable directly regardless of what the page does.
Every procedure the page calls must have `requireRole()` — use the `trpc-procedure` skill.

**Trap 7 — Reading the role from URL params or query strings.**
`rbac.md` Rule 6: the role is always from `session.user.role`.
A URL like `/dashboard?role=PROPRIETOR` must never elevate permissions.

**Trap 8 — Using the ACCOUNTANT role to access write procedures.**
`rbac-scopes.md` (Accountant — Read-Only With Export Rights): ACCOUNTANT has no write
access. Every procedure the accountant's pages call must be a `.query()` — never a `.mutation()`.
If a page mistakenly calls a mutation procedure and the ACCOUNTANT can reach it,
that is an RBAC violation even if the procedure has its own `requireRole()` guard.

---

## Verify before done

- [ ] Allowed roles confirmed against PRD §6.2 permission matrix — not inferred
- [ ] `rbac-scopes.md` checked for exceptions that override the matrix for this action
- [ ] Route file is in the correct folder group for its primary role audience
- [ ] Session is checked before any data is fetched — redirect comes first
- [ ] Unauthorised role redirects to that role's own dashboard (not to `/login`)
- [ ] No data appears in the redirect response
- [ ] PARENT routes include `parentLinks.some({ parentId: session.user.id, isActive: true })`
  in every student query
- [ ] PARENT `select` clauses exclude `StudentNote`, `DebtCollectionEvent`, and audit data
- [ ] Role is read from `session.user.role` — never from URL params, query strings, or request body
- [ ] Every tRPC procedure this page calls has `requireRole()` applied (verify with `trpc-procedure` skill)
- [ ] ACCOUNTANT pages call only `.query()` procedures — no `.mutation()` calls

**Tests to write:**
- Integration test: unauthenticated request to this route redirects to `/login`
- Integration test: PARENT navigating to a BURSAR route receives a redirect to `/parent/dashboard`
  with no student data in the response body
- Integration test: BURSAR navigating to a PROPRIETOR-only route (e.g., audit log) receives
  a redirect to `/bursar/dashboard`
- Integration test: PARENT query returns only students linked to that parent —
  a studentId belonging to a different parent returns no results
- Integration test: ACCOUNTANT can reach the route but cannot trigger any mutation
  through the procedures the page calls
- Unit test: `ROLE_DASHBOARDS` maps every role to a non-empty redirect path