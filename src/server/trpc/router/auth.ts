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
} from "@/server/services/auth";
import {
  updateUserProfile,
  changeUserPassword,
} from "@/server/services/users";

import { decrypt } from "@/server/services/encryption";

export const authRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
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
