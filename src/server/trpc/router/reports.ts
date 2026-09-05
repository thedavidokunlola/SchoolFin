// src/server/trpc/router/reports.ts
// tRPC router for income reports, analytics, and SMS usage metrics (Module I1, PRD §7.2)

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import { getIncomeReport } from "@/server/services/reports/income-report";
import { getSmsUsageStats } from "@/server/services/notifications/sms-cap";

export const reportsRouter = router({
  getIncome: protectedProcedure
    .use(requireRole("BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .input(
      z.object({
        termId: z.string().optional(),
        class: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return getIncomeReport(input);
    }),

  getSmsCapStats: protectedProcedure
    .use(requireRole("BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .query(async () => {
      return getSmsUsageStats();
    }),
});
