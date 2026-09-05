// src/server/services/balance/index.ts
// Single authoritative implementation of the balance formula
// Locked per money-handling.md Rule 2, PRD Module B1, and folder-structure.md Boundary 4

import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Computes the dynamic outstanding balance for a student in a specific term.
 * Formula per PRD Module B1 / Rule MONEY-2:
 *
 * Outstanding Balance =
 *     SUM(FeePosting.amount WHERE type = CHARGE AND studentId = X AND termId = Y)
 *   − SUM(FeePosting.amount WHERE type = REVERSAL AND studentId = X AND termId = Y)
 *   − SUM(Payment.amount WHERE status = SUCCESS AND studentId = X)
 *   − SUM(ManualCredit.amount WHERE studentId = X)
 *   − Student.creditBalance
 */
export async function computeOutstandingBalance(
  studentId: string,
  termId: string,
  tx?: Prisma.TransactionClient,
): Promise<Decimal> {
  const db = tx ?? prisma;

  const [student, chargesAgg, reversalsAgg, paymentsAgg, manualCreditsAgg] =
    await Promise.all([
      db.student.findUnique({
        where: { id: studentId },
        select: { creditBalance: true },
      }),
      db.feePosting.aggregate({
        _sum: { amount: true },
        where: {
          studentId,
          termId,
          type: "CHARGE",
        },
      }),
      db.feePosting.aggregate({
        _sum: { amount: true },
        where: {
          studentId,
          termId,
          type: "REVERSAL",
        },
      }),
      db.payment.aggregate({
        _sum: { amount: true },
        where: {
          studentId,
          status: "SUCCESS",
        },
      }),
      db.manualCredit.aggregate({
        _sum: { amount: true },
        where: {
          studentId,
        },
      }),
    ]);

  const zero = new Decimal("0.00");
  const creditBalance = student?.creditBalance ?? zero;
  const chargesSum = chargesAgg._sum.amount ?? zero;
  const reversalsSum = reversalsAgg._sum.amount ?? zero;
  const paymentsSum = paymentsAgg._sum.amount ?? zero;
  const manualCreditsSum = manualCreditsAgg._sum.amount ?? zero;

  const outstanding = chargesSum
    .sub(reversalsSum)
    .sub(paymentsSum)
    .sub(manualCreditsSum)
    .sub(creditBalance);

  return outstanding;
}

/**
 * Bulk variant to compute balances for multiple students in one term, preventing N+1 queries.
 */
export async function computeBatchOutstandingBalances(
  studentIds: string[],
  termId: string,
  tx?: Prisma.TransactionClient,
): Promise<Map<string, Decimal>> {
  const db = tx ?? prisma;
  const zero = new Decimal("0.00");
  const balanceMap = new Map<string, Decimal>();

  if (studentIds.length === 0) return balanceMap;

  const [students, charges, reversals, payments, manualCredits] =
    await Promise.all([
      db.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, creditBalance: true },
      }),
      db.feePosting.groupBy({
        by: ["studentId"],
        _sum: { amount: true },
        where: {
          studentId: { in: studentIds },
          termId,
          type: "CHARGE",
        },
      }),
      db.feePosting.groupBy({
        by: ["studentId"],
        _sum: { amount: true },
        where: {
          studentId: { in: studentIds },
          termId,
          type: "REVERSAL",
        },
      }),
      db.payment.groupBy({
        by: ["studentId"],
        _sum: { amount: true },
        where: {
          studentId: { in: studentIds },
          status: "SUCCESS",
        },
      }),
      db.manualCredit.groupBy({
        by: ["studentId"],
        _sum: { amount: true },
        where: {
          studentId: { in: studentIds },
        },
      }),
    ]);

  const chargesMap = new Map(charges.map((c) => [c.studentId, c._sum.amount ?? zero]));
  const reversalsMap = new Map(reversals.map((r) => [r.studentId, r._sum.amount ?? zero]));
  const paymentsMap = new Map(payments.map((p) => [p.studentId, p._sum.amount ?? zero]));
  const creditsMap = new Map(manualCredits.map((m) => [m.studentId, m._sum.amount ?? zero]));
  const creditBalanceMap = new Map(students.map((s) => [s.id, s.creditBalance ?? zero]));

  for (const id of studentIds) {
    const cSum = chargesMap.get(id) ?? zero;
    const rSum = reversalsMap.get(id) ?? zero;
    const pSum = paymentsMap.get(id) ?? zero;
    const mcSum = creditsMap.get(id) ?? zero;
    const cb = creditBalanceMap.get(id) ?? zero;

    const outstanding = cSum.sub(rSum).sub(pSum).sub(mcSum).sub(cb);
    balanceMap.set(id, outstanding);
  }

  return balanceMap;
}
