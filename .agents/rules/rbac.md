---
trigger: glob
globs:
  - "src/server/trpc/**"
  - "src/app/**"
---

# rbac.md

> 🔴 Every rule here is a hard requirement.  
> A procedure that does the right thing for the wrong role is a failed task.

---

## Rule 1 — Every tRPC Procedure Has a Role Guard

🔴 **No tRPC procedure executes business logic before the role-guard middleware runs.**

Role guards are applied in tRPC middleware, not inside the procedure body:

```typescript
// src/server/trpc/middleware/role-guard.ts
export function requireRole(...roles: Role[]) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (!roles.includes(ctx.session.user.role)) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({ ctx });
  });
}

// Usage in a router
export const feesRouter = router({
  postToClass: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(postToClassSchema)
    .mutation(async ({ input, ctx }) => { … }),
});
```

🔴 **An unauthorised call returns `UNAUTHORIZED` with no data in the response body.**  
Never return partial data and then say "you don't have permission to see the rest."

---

## Rule 2 — The Permission Matrix Is the Law

🔴 **The table below is the complete and final authority on what each role can do.**  
Do not grant a permission that is not in this table. Do not infer permissions ("the bursar can post fees so they probably can also delete them"). Do not grant a lower role access to a higher-role procedure because "it seems safe."

| Action | PARENT | BURSAR | ACCOUNTANT | PROPRIETOR |
|---|---|---|---|---|
| View own student profile | ✅ | ✅ | ✅ | ✅ |
| View all student profiles | ❌ | ✅ | ✅ | ✅ |
| View internal notes | ❌ | ✅ | ❌ | ✅ |
| View debt collection log | ❌ | ✅ | ❌ | ✅ |
| View audit log | ❌ | ❌ | ❌ | ✅ |
| Post fees (individual) | ❌ | ✅ | ❌ | ✅ |
| Post fees (bulk by class) | ❌ | ✅ | ❌ | ✅ |
| Record manual cash credit | ❌ | ✅ | ❌ | ✅ |
| Make online payment | ✅ | ❌ | ❌ | ❌ |
| Create installment plan preset | ❌ | ✅ | ❌ | ✅ |
| Select installment plan | ✅ | ❌ | ❌ | ❌ |
| Pause automated messages | ❌ | ✅ | ❌ | ✅ |
| Add internal note | ❌ | ✅ | ❌ | ✅ |
| Export debtor list | ❌ | ✅ | ✅ | ✅ |
| Export income report | ❌ | ✅ | ✅ | ✅ |
| Export tax audit file | ❌ | ❌ | ✅ | ✅ |
| Manage user accounts | ❌ | ❌ | ❌ | ✅ |
| Configure fee structures | ❌ | ✅ | ❌ | ✅ |
| Configure academic terms | ❌ | ❌ | ❌ | ✅ |
| Configure debt rules | ❌ | ✅ | ❌ | ✅ |
| Configure message templates | ❌ | ✅ | ❌ | ✅ |
| Apply fee waiver | ❌ | ✅ | ❌ | ✅ |
| Download own receipts | ✅ | ❌ | ❌ | ❌ |
| Reprint any receipt | ❌ | ✅ | ❌ | ✅ |
| Create parent accounts | ❌ | ✅ | ❌ | ✅ |
| Link/unlink students to parents | ❌ | ✅ | ❌ | ✅ |
| Reverse fee posting (within 24 hrs) | ❌ | ❌ | ❌ | ✅ |

---

## Rule 3 — Route-Level Protection

🔴 **Every page route enforces role-based access.**  
A user who navigates directly to a restricted URL is redirected to their own dashboard. No data is exposed in the redirect response.

| Role | Own dashboard route |
|---|---|
| PARENT | `/parent/dashboard` |
| BURSAR | `/bursar/dashboard` |
| ACCOUNTANT | `/accountant/dashboard` |
| PROPRIETOR | `/proprietor/dashboard` |

🔴 **A PARENT navigating to `/bursar/students` receives a 403 redirect to `/parent/dashboard`.**  
The response must not include any student data, even in the redirect payload.

---

## Rule 4 — Parent Data Isolation

🔴 **A PARENT can only view financial profiles for students linked to their account via `ParentStudentLink`.**

In every query that returns student data for a PARENT:
```typescript
// Always scope student queries for PARENT role
where: {
  parentLinks: {
    some: {
      parentId: ctx.session.user.id,
      isActive: true,
    },
  },
}
```

🔴 **A PARENT cannot call any tRPC procedure that modifies data.**  
The only write action a PARENT can perform is initiating a Flutterwave payment. All other PARENT-facing procedures are queries.

---

## Rule 5 — Four Roles Only

🔴 **The system has exactly four roles: PARENT, BURSAR, ACCOUNTANT, PROPRIETOR.**  
Do not add a fifth role. Do not create a VIEW_ONLY, SECRETARY, ADMIN, or SUPERADMIN role. This is an unresolved open question in PRD §13-Q9. If the client asks for a new role, stop and raise it for human sign-off before building anything.

---

## Rule 6 — Role Is Always Read From the Session, Never From Input

🔴 **The user's role is always read from `ctx.session.user.role`.**  
Never trust a role value passed in request input. Never allow a client to specify their own role. The session is the source of truth.