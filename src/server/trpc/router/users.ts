// src/server/trpc/router/users.ts
// tRPC users & staff router

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import {
  createStaffAccount,
  listStaffAccounts,
  deactivateUserAccount,
} from "@/server/services/users";
import { prisma } from "@/server/db/prisma";

export const usersRouter = router({
  listStaff: protectedProcedure
    .use(requireRole("PROPRIETOR"))
    .query(async () => {
      return await listStaffAccounts();
    }),

  listAll: protectedProcedure
    .use(requireRole("PROPRIETOR"))
    .query(async () => {
      return await prisma.user.findMany({
        orderBy: [{ role: "asc" }, { lastName: "asc" }],
      });
    }),

  createStaff: protectedProcedure
    .use(requireRole("PROPRIETOR"))
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        role: z.enum(["BURSAR", "ACCOUNTANT", "PROPRIETOR"]),
        phone: z.string().optional(),
        password: z.string().min(8).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await createStaffAccount(input, ctx.session.user.id);
    }),

  deactivate: protectedProcedure
    .use(requireRole("PROPRIETOR"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      return await deactivateUserAccount(input.id, ctx.session.user.id);
    }),
});
