// src/server/trpc/router/terms.ts
// tRPC academic terms router

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import {
  createAcademicTerm,
  listAcademicTerms,
  setActiveTerm,
  setPaymentDueDate,
  updateAcademicTerm,
  deleteAcademicTerm,
} from "@/server/services/terms";

export const termsRouter = router({
  getAll: protectedProcedure
    .use(requireRole("PARENT", "BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .query(async () => {
      return await listAcademicTerms();
    }),

  getActive: protectedProcedure
    .use(requireRole("PARENT", "BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .query(async ({ ctx }) => {
      return await ctx.prisma.academicTerm.findFirst({
        where: { isActive: true },
      });
    }),

  create: protectedProcedure
    .use(requireRole("PROPRIETOR"))
    .input(
      z.object({
        name: z.string().min(1),
        startDate: z.date(),
        endDate: z.date(),
        paymentDueDate: z.date().optional().nullable(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await createAcademicTerm(input, ctx.session.user.id);
    }),

  update: protectedProcedure
    .use(requireRole("PROPRIETOR"))
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        startDate: z.date(),
        endDate: z.date(),
        paymentDueDate: z.date().optional().nullable(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await updateAcademicTerm(input, ctx.session.user.id);
    }),

  delete: protectedProcedure
    .use(requireRole("PROPRIETOR"))
    .input(
      z.object({
        id: z.string().min(1),
        force: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await deleteAcademicTerm(input.id, ctx.session.user.id, input.force);
    }),

  setActive: protectedProcedure
    .use(requireRole("PROPRIETOR"))
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      return await setActiveTerm(input.id, ctx.session.user.id);
    }),

  setPaymentDueDate: protectedProcedure
    .use(requireRole("PROPRIETOR"))
    .input(
      z.object({
        termId: z.string().min(1),
        paymentDueDate: z.date(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await setPaymentDueDate(
        input.termId,
        input.paymentDueDate,
        ctx.session.user.id,
      );
    }),
});
