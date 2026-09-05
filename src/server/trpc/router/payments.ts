// src/server/trpc/router/payments.ts
// tRPC payments router enforcing PRD §6.2 RBAC

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import {
  initiateOnlinePayment,
  verifyPaymentStatus,
} from "@/server/services/payments";

export const paymentsRouter = router({
  initiateOnlinePayment: protectedProcedure
    .use(requireRole("PARENT", "BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        studentId: z.string(),
        amount: z.union([z.string(), z.number()]),
        termId: z.string(),
        installmentId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      return initiateOnlinePayment({
        studentId: input.studentId,
        amount: input.amount,
        termId: input.termId,
        payerEmail: user.email,
        payerName: `${user.firstName} ${user.lastName}`,
        installmentId: input.installmentId,
      });
    }),

  verify: protectedProcedure
    .use(requireRole("PARENT", "BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .input(
      z.object({
        txRef: z.string(),
        transactionId: z.union([z.string(), z.number()]).optional(),
      }),
    )
    .query(async ({ input }) => {
      return verifyPaymentStatus(input.txRef, input.transactionId);
    }),
});
