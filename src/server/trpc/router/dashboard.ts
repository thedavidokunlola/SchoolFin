// src/server/trpc/router/dashboard.ts
// tRPC dashboard metrics router

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import { getProprietorMetrics } from "@/server/services/dashboard";

export const dashboardRouter = router({
  getMetrics: protectedProcedure
    .use(requireRole("BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .input(
      z.object({
        termId: z.string().optional(),
      }).optional(),
    )
    .query(async ({ input }) => {
      return await getProprietorMetrics(input?.termId);
    }),
});
