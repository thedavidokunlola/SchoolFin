// src/server/trpc/middleware/role-guard.ts
// RBAC middleware enforcing PRD §6.2 permission matrix
// Locked per rbac.md and AUTH-1/AUTH-2

import { TRPCError } from "@trpc/server";
import { middleware } from "@/server/trpc/trpc";
import type { UserRole } from "@/lib/constants";

export function requireRole(...rolesOrArray: (UserRole | UserRole[])[]) {
  const allowedRoles: UserRole[] = rolesOrArray.flat();

  return middleware(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      });
    }

    const userRole = ctx.session.user.role;
    if (!allowedRoles.includes(userRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
      },
    });
  });
}
