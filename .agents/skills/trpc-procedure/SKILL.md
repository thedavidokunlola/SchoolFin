---
name: trpc-procedure
description: >
  Load this skill when you hear: "add a procedure", "create a router", "implement an endpoint",
  "add a mutation", "add a query", "wire up the API for", "build the tRPC for".
  Applies to every file created inside src/server/trpc/router/.
---

## What this skill does
Teaches the exact assembly order for a correct tRPC procedure.
The individual laws live in: `coding-standards.md`, `rbac.md`, `audit-log.md`,
`rate-limiting.md`, `money-handling.md`, and AGENTS.md §3 GROUP A–C.
This skill does not restate those laws. It tells you the order to apply them.

---

## Procedure

### Step 1 — Identify the procedure's name and router
Look up the procedure in PRD §6.3. Use the exact name listed there. No invented names.
Confirm which router file it belongs to. One router file per domain (`fees.ts`, `payments.ts`, etc.).

### Step 2 — Define the Zod input schema
Write the Zod schema first, before any procedure code.
Place it in the same file as the procedure, or import it from `src/lib/schemas/`.
Every field that holds a monetary amount uses `z.string()` and is converted to `Decimal`
inside the service — never `z.number()` for money.

```typescript
// src/server/trpc/router/fees.ts
import { z } from "zod";

const postToStudentSchema = z.object({
  studentId: z.string().cuid(),
  feeStructureId: z.string().cuid(),
  termId: z.string().cuid(),
  description: z.string().min(1),
});
```

### Step 3 — Declare the procedure with role-guard middleware
Apply `requireRole()` before any logic runs.
Read the permission matrix in PRD §6.2 to confirm which roles are allowed.
Never infer permissions. Never skip the middleware.

```typescript
import { requireRole } from "@/server/trpc/middleware/role-guard";
import { protectedProcedure, router } from "@/server/trpc";

export const feesRouter = router({
  postToStudent: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))   // Step 3: role guard FIRST
    .input(postToStudentSchema)                  // Step 2 schema wired here
    .mutation(async ({ input, ctx }) => {
      // Step 4 goes here
    }),
});
```

### Step 4 — Call the service function; put all logic there
The procedure body does exactly three things: validate (Zod did it), call service, return result.
No `if` statements that are not about input validation belong inside the procedure.
All business rules live in `src/server/services/`.

```typescript
    .mutation(async ({ input, ctx }) => {
      const result = await postFeeToStudent({   // service call only
        ...input,
        postedById: ctx.session.user.id,
      });
      return result;                            // return typed result
    }),
```

### Step 5 — Handle errors without silent catch
Inside the service function (not the procedure), every `catch` block must do at least one of:
re-throw, log to Sentry, or return a typed error response.
An empty `catch` body is a build failure per `coding-standards.md`.

```typescript
// Inside the service, not the procedure
try {
  await prisma.feePosting.create({ data: postingData });
} catch (e) {
  Sentry.captureException(e);
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Fee posting failed" });
}
```

### Step 6 — Write the AuditLog entry
Load the `audit-log-entry` skill now and execute it for this action.
The audit write happens inside the service, in the same transaction where possible.
Do not return from the service before the audit write completes.

### Step 7 — Verify monetary fields use Decimal
If the procedure touches any monetary value, load the `money-handling.md` rules.
Confirm no JS number arithmetic touches a monetary Decimal at any point in the call chain.

### Step 8 — Run the build checks
```bash
tsc --noEmit        # zero errors required
eslint src/         # zero errors required; document any warnings
prisma validate     # if schema was touched
```

---

## Code skeleton — full assembled procedure

```typescript
// src/server/trpc/router/fees.ts
import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import { postFeeToStudent } from "@/server/services/fees/post-fee-to-student";
import { TRPCError } from "@trpc/server";

const postToStudentSchema = z.object({
  studentId: z.string().cuid(),
  feeStructureId: z.string().cuid(),
  termId: z.string().cuid(),
  description: z.string().min(1),
});

export const feesRouter = router({
  postToStudent: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))   // 1. role guard
    .input(postToStudentSchema)                  // 2. zod schema
    .mutation(async ({ input, ctx }) => {        // 3. thin body
      return await postFeeToStudent({            // 4. service call only
        ...input,
        postedById: ctx.session.user.id,
      });
    }),
});
```

```typescript
// src/server/services/fees/post-fee-to-student.ts
import { prisma } from "@/server/db/prisma";
import { writeAuditLog } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { TRPCError } from "@trpc/server";
import * as Sentry from "@sentry/node";

export async function postFeeToStudent(input: PostFeeInput) {
  return await prisma.$transaction(async (tx) => {
    // business logic here

    await writeAuditLog({                        // 5. audit inside transaction
      userId: input.postedById,
      action: AUDIT_ACTIONS.FEE_POSTED_INDIVIDUAL,
      entity: "FeePosting",
      entityId: posting.id,
      metadata: { studentId: input.studentId, feeStructureId: input.feeStructureId },
    }, tx);

    return posting;
  });
}
```

---

## Traps

**Trap 1 — Business logic inside the procedure body.**
Any `if` statement that is not input validation belongs in the service.
Symptom: the `.mutation()` body is more than ~5 lines.

**Trap 2 — Skipping the role guard on a "read" query.**
Every procedure — including `.query()` — gets `requireRole()`.
Reads that expose any data to an unauthorised role are a failed task per `rbac.md` Rule 1.

**Trap 3 — Inventing a procedure name not in PRD §6.3.**
The tRPC router structure is locked. Creating `fees.reversePosting` when PRD §6.3 says
`fees.postToClass` is a scope violation. Check PRD §6.3 before naming anything.

**Trap 4 — Writing the audit log after the `return` statement.**
The audit write must complete before the function returns.
Placing `writeAuditLog` after `return posting` means it never executes.

**Trap 5 — Reading the role from `input` instead of `ctx.session.user.role`.**
Rule AUTH-9 / `rbac.md` Rule 6: the role is always read from the session.
Never trust a role value passed in request input.

**Trap 6 — Using `export default` for the router.**
`coding-standards.md` requires named exports everywhere except Next.js page components.
Use `export const feesRouter = router({...})`.

---

## Verify before done

- [ ] Procedure name matches PRD §6.3 exactly — no invented names
- [ ] Zod schema is defined and wired to `.input()`
- [ ] `requireRole()` middleware is applied and the roles match PRD §6.2 permission matrix
- [ ] Procedure body calls exactly one service function — no inline business logic
- [ ] Service function has no empty `catch` blocks
- [ ] AuditLog entry is written inside the same transaction as the state change
- [ ] No monetary value passes through a JS `number` at any point
- [ ] `tsc --noEmit` passes with zero errors
- [ ] `eslint` passes with zero errors

**Tests to write:**
- Unit test: service function produces the correct output for valid input
- Unit test: service function throws `TRPCError` on the expected failure cases
- Integration test: procedure returns `UNAUTHORIZED` when called by a role not in `requireRole()`
- Integration test: AuditLog record exists in the test database after a successful mutation
- Integration test: duplicate-blocking rules (if applicable to this procedure) reject the second call