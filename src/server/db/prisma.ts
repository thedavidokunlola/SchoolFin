// src/server/db/prisma.ts
// Singleton Prisma client instantiation
// Locked per folder-structure.md Boundary 5

import { PrismaClient } from "@prisma/client";
import { config } from "@/lib/config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isProduction ? ["error"] : ["query", "error", "warn"],
  });

if (!config.isProduction) {
  globalForPrisma.prisma = prisma;
}
