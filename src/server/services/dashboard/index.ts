// src/server/services/dashboard/index.ts
// Financial metrics and dashboard calculations for Proprietor and Bursar

import { prisma } from "@/server/db/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { computeBatchOutstandingBalances } from "@/server/services/balance";

export async function getProprietorMetrics(termId?: string) {
  let activeTermId = termId;
  if (!activeTermId) {
    const activeTerm = await prisma.academicTerm.findFirst({
      where: { isActive: true },
    });
    activeTermId = activeTerm?.id;
  }

  const [activeStudentsCount, activeStudents, chargesAgg, reversalsAgg, paymentsAgg, creditsAgg] =
    await Promise.all([
      prisma.student.count({ where: { isActive: true } }),
      prisma.student.findMany({
        where: { isActive: true },
        select: { id: true },
      }),
      activeTermId
        ? prisma.feePosting.aggregate({
            _sum: { amount: true },
            where: { termId: activeTermId, type: "CHARGE" },
          })
        : { _sum: { amount: new Decimal("0.00") } },
      activeTermId
        ? prisma.feePosting.aggregate({
            _sum: { amount: true },
            where: { termId: activeTermId, type: "REVERSAL" },
          })
        : { _sum: { amount: new Decimal("0.00") } },
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "SUCCESS" },
      }),
      prisma.manualCredit.aggregate({
        _sum: { amount: true },
      }),
    ]);

  const zero = new Decimal("0.00");
  const netPosted = (chargesAgg._sum.amount ?? zero).sub(reversalsAgg._sum.amount ?? zero);
  const totalCollected = (paymentsAgg._sum.amount ?? zero).add(creditsAgg._sum.amount ?? zero);

  // Compute total outstanding debt across all active students
  let totalOutstanding = zero;
  if (activeTermId && activeStudents.length > 0) {
    const studentIds = activeStudents.map((s) => s.id);
    const balanceMap = await computeBatchOutstandingBalances(studentIds, activeTermId);
    for (const bal of balanceMap.values()) {
      if (bal.greaterThan(zero)) {
        totalOutstanding = totalOutstanding.add(bal);
      }
    }
  }

  // Recent transactions
  const [recentPostings, recentCredits] = await Promise.all([
    prisma.feePosting.findMany({
      take: 5,
      orderBy: { postedAt: "desc" },
      include: {
        student: { select: { firstName: true, lastName: true, class: true } },
        feeStructure: { select: { name: true } },
      },
    }),
    prisma.manualCredit.findMany({
      take: 5,
      orderBy: { recordedAt: "desc" },
      include: {
        student: { select: { firstName: true, lastName: true, class: true } },
        recordedBy: { select: { firstName: true, lastName: true } },
        receipt: true,
      },
    }),
  ]);

  return {
    activeStudentsCount,
    totalPosted: netPosted.toString(),
    totalCollected: totalCollected.toString(),
    totalOutstanding: totalOutstanding.toString(),
    activeTermId,
    recentPostings,
    recentCredits,
  };
}
