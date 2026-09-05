// src/server/trpc/router/students.ts
// tRPC students router enforcing PRD §6.2 RBAC

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import {
  createStudent,
  updateStudent,
  deactivateStudent,
  deleteStudent,
  getStudentProfile,
  listStudents,
  linkParentToStudent,
  unlinkParentFromStudent,
  addStudentNote,
} from "@/server/services/students";
import { TRPCError } from "@trpc/server";

export const studentsRouter = router({
  getAll: protectedProcedure
    .use(requireRole("BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .input(
      z.object({
        search: z.string().optional(),
        class: z.string().optional(),
        isActive: z.boolean().optional(),
        take: z.number().min(1).max(100).optional(),
        skip: z.number().min(0).optional(),
      }),
    )
    .query(async ({ input }) => {
      return await listStudents(input);
    }),

  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        termId: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const user = ctx.session.user;
      // If user is PARENT, check if they are linked to this student
      if (user.role === "PARENT") {
        const link = await ctx.prisma.parentStudentLink.findFirst({
          where: {
            parentId: user.id,
            studentId: input.id,
            isActive: true,
          },
        });
        if (!link) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorised to view this student profile.",
          });
        }
      }
      return await getStudentProfile(input.id, input.termId);
    }),

  create: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        admissionNumber: z.string().min(1),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        class: z.string().min(1),
        photoUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await createStudent(input, ctx.session.user.id);
    }),

  update: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        id: z.string(),
        admissionNumber: z.string().min(1).optional(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        class: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
        photoUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await updateStudent(input, ctx.session.user.id);
    }),

  deactivate: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return await deactivateStudent(input.id, ctx.session.user.id);
    }),

  delete: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        id: z.string(),
        force: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await deleteStudent(input.id, ctx.session.user.id, input.force);
    }),

  linkParent: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        parentId: z.string(),
        studentId: z.string(),
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

  unlinkParent: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        parentId: z.string(),
        studentId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await unlinkParentFromStudent(
        input.parentId,
        input.studentId,
        ctx.session.user.id,
      );
    }),

  addNote: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        studentId: z.string(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await addStudentNote(
        input.studentId,
        input.content,
        ctx.session.user.id,
      );
    }),
});
