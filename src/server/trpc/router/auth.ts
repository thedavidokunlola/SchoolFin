// src/server/trpc/router/auth.ts
// tRPC auth router for password resets and invites

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import {
  requestPasswordReset,
  resetPassword,
  createParentInvite,
  acceptParentInvite,
  getSchoolSetupStatus,
  sendSetupOtp,
  initializeSchool,
} from "@/server/services/auth";
import {
  updateUserProfile,
  changeUserPassword,
} from "@/server/services/users";

import { decrypt } from "@/server/services/encryption";

export const authRouter = router({
  getSetupStatus: publicProcedure.query(async () => {
    return await getSchoolSetupStatus();
  }),

  sendSetupOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        adminName: z.string().min(1, "Name is required"),
      }),
    )
    .mutation(async ({ input }) => {
      return await sendSetupOtp(input.email, input.adminName);
    }),

  initializeSchool: publicProcedure
    .input(
      z.object({
        adminFirstName: z.string().min(1, "First name is required"),
        adminLastName: z.string().min(1, "Last name is required"),
        adminEmail: z.string().email("Invalid email address"),
        adminPosition: z.string().optional(),
        adminPassword: z.string().min(8, "Password must be at least 8 characters"),
        adminPhone: z.string().optional(),
        otpCode: z.string().min(6, "6-digit verification code is required"),
        termName: z.string().optional(),
        termStartDate: z.date().optional(),
        termEndDate: z.date().optional(),
        paymentDueDate: z.date().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await initializeSchool(input);
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      phone: user.phone ? decrypt(user.phone) : null,
    };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await updateUserProfile(ctx.session.user.id, input);
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await changeUserPassword(ctx.session.user.id, input);
    }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      return await requestPasswordReset(input.email);
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ input }) => {
      return await resetPassword(input.token, input.newPassword);
    }),

  createParentInvite: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(z.object({ parentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return await createParentInvite(input.parentId, ctx.session.user.id);
    }),

  acceptParentInvite: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        newPassword: z.string().min(8),
      }),
    )
    .mutation(async ({ input }) => {
      return await acceptParentInvite(input.token, input.newPassword);
    }),
});
