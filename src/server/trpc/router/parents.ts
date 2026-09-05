// src/server/trpc/router/parents.ts
// tRPC parents router for creating parent accounts and managing links (Module A4)

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import {
  createParentAccount,
  listParentAccounts,
  getParentChildren,
} from "@/server/services/users";
import {
  linkParentToStudent,
  unlinkParentFromStudent,
} from "@/server/services/students";

export const parentsRouter = router({
  getMyChildren: protectedProcedure
    .use(requireRole("PARENT"))
    .query(async ({ ctx }) => {
      return await getParentChildren(ctx.session.user.id);
    }),

  getAll: protectedProcedure
    .use(requireRole("BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .input(
      z.object({
        search: z.string().optional(),
      }).optional(),
    )
    .query(async ({ input }) => {
      return await listParentAccounts(input);
    }),

  create: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().optional(),
        studentId: z.string().optional(),
        relationship: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await createParentAccount(input, ctx.session.user.id);
    }),

  linkStudent: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        parentId: z.string().min(1),
        studentId: z.string().min(1),
        relationship: z.string().default("Parent"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await linkParentToStudent(
        input.parentId,
        input.studentId,
        input.relationship,
        ctx.session.user.id,
      );
    }),

  unlinkStudent: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        parentId: z.string().min(1),
        studentId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await unlinkParentFromStudent(
        input.parentId,
        input.studentId,
        ctx.session.user.id,
      );
    }),
});
