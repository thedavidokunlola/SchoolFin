// src/server/trpc/router/debtors.ts
// tRPC router for Debtor List and Bulk Reminders (Module H1, H2)

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import { getDebtorsList, sendBulkManualReminders } from "@/server/services/debtors";

export const debtorsRouter = router({
  getList: protectedProcedure
    .use(requireRole("BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .input(
      z.object({
        termId: z.string().optional(),
        class: z.string().optional(),
        search: z.string().optional(),
        minAmount: z.number().optional(),
        minOverdueDays: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      return getDebtorsList(input);
    }),

  sendBulkReminders: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        studentIds: z.array(z.string()),
        channel: z.enum(["EMAIL", "SMS", "BOTH"]),
        customMessage: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return sendBulkManualReminders({
        ...input,
        senderId: ctx.session.user.id,
      });
    }),
});
