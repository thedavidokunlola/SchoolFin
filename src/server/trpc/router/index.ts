// src/server/trpc/router/index.ts
// Root tRPC router assembly

import { router } from "@/server/trpc/trpc";
import { authRouter } from "./auth";
import { studentsRouter } from "./students";
import { feesRouter } from "./fees";
import { manualCreditsRouter } from "./manualCredits";
import { termsRouter } from "./terms";
import { usersRouter } from "./users";
import { parentsRouter } from "./parents";
import { receiptsRouter } from "./receipts";
import { auditLogRouter } from "./auditLog";
import { dashboardRouter } from "./dashboard";
import { paymentsRouter } from "./payments";
import { installmentsRouter } from "./installments";
import { debtorsRouter } from "./debtors";
import { debtCollectionRouter } from "./debtCollection";
import { reportsRouter } from "./reports";
import { complianceRouter } from "./compliance";

export const appRouter = router({
  auth: authRouter,
  students: studentsRouter,
  fees: feesRouter,
  manualCredits: manualCreditsRouter,
  terms: termsRouter,
  users: usersRouter,
  parents: parentsRouter,
  receipts: receiptsRouter,
  auditLog: auditLogRouter,
  dashboard: dashboardRouter,
  payments: paymentsRouter,
  installments: installmentsRouter,
  debtors: debtorsRouter,
  debtCollection: debtCollectionRouter,
  reports: reportsRouter,
  compliance: complianceRouter,
});

export type AppRouter = typeof appRouter;
