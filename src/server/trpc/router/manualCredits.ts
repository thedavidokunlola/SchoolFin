// src/server/trpc/router/manualCredits.ts
// tRPC manualCredits router for cash payments and receipts

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import {
  recordManualCredit,
  getCashReceipt,
  checkDuplicateCash,
} from "@/server/services/cash";

export const manualCreditsRouter = router({
  checkDuplicate: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        studentId: z.string().min(1),
        amount: z.string().min(1),
      }),
    )
    .query(async ({ input, ctx }) => {
      return await checkDuplicateCash({
        studentId: input.studentId,
        amount: input.amount,
        recordedById: ctx.session.user.id,
      });
    }),

  create: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        studentId: z.string().min(1),
        amount: z.string().min(1), // Decimal string
        description: z.string().min(1),
        referenceNote: z.string().optional(),
        reasonForDuplicate: z.string().optional(),
        reasonForOverpayment: z.string().optional(),
        termId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await recordManualCredit(input, ctx.session.user.id);
    }),

  getReceipt: protectedProcedure
    .input(
      z.object({
        receiptNumber: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      return await getCashReceipt(input.receiptNumber);
    }),

  getByStudent: protectedProcedure
    .input(
      z.object({
        studentId: z.string().min(1),
      }),
    )
    .query(async ({ input, ctx }) => {
      return await ctx.prisma.manualCredit.findMany({
        where: { studentId: input.studentId },
        include: {
          recordedBy: { select: { firstName: true, lastName: true } },
          receipt: true,
        },
        orderBy: { recordedAt: "desc" },
      });
    }),
});
