// src/server/trpc/router/compliance.ts
// tRPC router for NDPA Compliance and Data Subject Requests (Module J2)

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import { exportSubjectData, anonymiseSubjectData } from "@/server/services/compliance";

export const complianceRouter = router({
  exportSubjectData: protectedProcedure
    .use(requireRole("PROPRIETOR"))
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return exportSubjectData(input.userId, ctx.session.user.id);
    }),

  anonymiseSubjectData: protectedProcedure
    .use(requireRole("PROPRIETOR"))
    .input(
      z.object({
        userId: z.string(),
        reason: z.string().min(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return anonymiseSubjectData({
        ...input,
        requestingUserId: ctx.session.user.id,
      });
    }),
});
