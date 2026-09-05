// src/server/trpc/router/installments.ts
// tRPC installments router enforcing PRD §6.2 RBAC

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import {
  createInstallmentPlanTemplate,
  getInstallmentPlans,
  selectStudentInstallmentPlan,
  getStudentInstallments,
} from "@/server/services/installments";

export const installmentsRouter = router({
  createPreset: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        name: z.string().min(2),
        description: z.string().optional(),
        numberOfParts: z.number().int().min(2).max(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return createInstallmentPlanTemplate({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  getPresets: protectedProcedure
    .use(requireRole("PARENT", "BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .query(async () => {
      return getInstallmentPlans();
    }),

  selectPlan: protectedProcedure
    .use(requireRole("PARENT", "BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        studentId: z.string().cuid().or(z.string()),
        planId: z.string().cuid().or(z.string()),
        termId: z.string().cuid().or(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return selectStudentInstallmentPlan({
        ...input,
        selectedById: ctx.session.user.id,
      });
    }),

  getStudentPlan: protectedProcedure
    .use(requireRole("PARENT", "BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .input(z.object({ studentId: z.string() }))
    .query(async ({ input }) => {
      return getStudentInstallments(input.studentId);
    }),
});
