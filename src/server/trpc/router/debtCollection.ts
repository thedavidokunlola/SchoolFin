// src/server/trpc/router/debtCollection.ts
// tRPC router for Debt Collection rules, templates, pause management, and logs

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";
import {
  createDebtCollectionRule,
  getDebtCollectionRules,
  createCommunicationTemplate,
  getCommunicationTemplates,
  toggleStudentMessagePause,
  getDebtCollectionEvents,
} from "@/server/services/debt-collection";

export const debtCollectionRouter = router({
  getRules: protectedProcedure
    .use(requireRole("BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .input(z.object({ termId: z.string().optional() }))
    .query(async ({ input }) => {
      return getDebtCollectionRules(input.termId);
    }),

  createRule: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        termId: z.string(),
        stage: z.enum(["REMINDER", "ESCALATION", "FINAL_NOTICE"]),
        daysOverdue: z.number().int(),
        templateId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return createDebtCollectionRule({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  getTemplates: protectedProcedure
    .use(requireRole("BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .query(async () => {
      return getCommunicationTemplates();
    }),

  createTemplate: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        name: z.string().min(2),
        channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
        subject: z.string().optional(),
        body: z.string().min(5),
        variables: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return createCommunicationTemplate({
        ...input,
        createdById: ctx.session.user.id,
      });
    }),

  togglePause: protectedProcedure
    .use(requireRole("BURSAR", "PROPRIETOR"))
    .input(
      z.object({
        studentId: z.string(),
        isPaused: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return toggleStudentMessagePause({
        ...input,
        updatedById: ctx.session.user.id,
      });
    }),

  getEvents: protectedProcedure
    .use(requireRole("BURSAR", "ACCOUNTANT", "PROPRIETOR"))
    .input(
      z.object({
        studentId: z.string().optional(),
        limit: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      return getDebtCollectionEvents(input);
    }),
});
