// src/server/trpc/router/receipts.ts
// tRPC receipts router (Module L1 / Rule SEC-5)

import { z } from "zod";
import { router, publicProcedure } from "@/server/trpc/trpc";
import { verifyReceiptPublic } from "@/server/services/receipts";

export const receiptsRouter = router({
  verify: publicProcedure
    .input(z.object({ receiptNumber: z.string().min(1) }))
    .query(async ({ input }) => {
      return await verifyReceiptPublic(input.receiptNumber);
    }),
});
