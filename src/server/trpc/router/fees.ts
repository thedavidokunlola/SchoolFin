// src/server/trpc/router/fees.ts
// tRPC fees router enforcing PRD §6.2 RBAC

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import {
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  listFeeStructures,
  postFeeToStudent,
  postFeeToClass,
  reverseFeePosting,
} from "@/server/services/fees";

export const feesRouter = router({
  getStructures: protectedProcedure
    .use(requireRole("BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .input(
      z.object({
        termId: z.string().optional(),
        class: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await listFeeStructures(input.termId, input.class);
    }),

  createStructure: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        name: z.string().min(1),
        class: z.string().min(1),
        termId: z.string().min(1),
        lineItems: z.array(
          z.object({
            label: z.string().min(1),
            amount: z.string().min(1), // Decimal string
            isOptional: z.boolean().optional(),
          }),
        ).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await createFeeStructure(input, ctx.session.user.id);
    }),

  updateStructure: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        class: z.string().min(1),
        termId: z.string().min(1),
        lineItems: z.array(
          z.object({
            label: z.string().min(1),
            amount: z.string().min(1),
            isOptional: z.boolean().optional(),
          }),
        ).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await updateFeeStructure(input, ctx.session.user.id);
    }),

  deleteStructure: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        id: z.string().min(1),
        force: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await deleteFeeStructure(input.id, ctx.session.user.id, input.force);
    }),

  postToStudent: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        studentId: z.string().min(1),
        feeStructureId: z.string().min(1),
        termId: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await postFeeToStudent(input, ctx.session.user.id);
    }),

  postToClass: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        class: z.string().min(1),
        feeStructureId: z.string().min(1),
        termId: z.string().min(1),
        description: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await postFeeToClass(input, ctx.session.user.id);
    }),

  reversePosting: protectedProcedure
    .use(requireRole("PROPRIETOR"))
    .input(
      z.object({
        postingId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await reverseFeePosting(input.postingId, ctx.session.user.id);
    }),
});
