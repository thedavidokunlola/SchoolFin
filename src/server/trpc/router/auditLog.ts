// src/server/trpc/router/auditLog.ts
// tRPC auditLog router (PROPRIETOR only)
// Locked per PRD §6.2 and AUDIT-2

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/trpc/middleware/role-guard";

export const auditLogRouter = router({
  getAll: protectedProcedure
    .use(requireRole("PROPRIETOR"))
    .input(
      z.object({
        isSensitiveOnly: z.boolean().optional(),
        entity: z.string().optional(),
        userId: z.string().optional(),
        take: z.number().min(1).max(100).optional(),
        skip: z.number().min(0).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const where: import("@prisma/client").Prisma.AuditLogWhereInput = {
        ...(input.isSensitiveOnly ? { isSensitive: true } : {}),
        ...(input.entity ? { entity: input.entity } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
      };

      const [total, logs] = await Promise.all([
        ctx.prisma.auditLog.count({ where }),
        ctx.prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: input.take ?? 50,
          skip: input.skip ?? 0,
        }),
      ]);

      return { total, logs };
    }),
});
