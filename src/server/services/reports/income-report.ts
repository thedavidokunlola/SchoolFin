// src/server/services/reports/income-report.ts
// School Income Report & Analytics service
// Locked per Module I1 and Rule PERF-6

import { prisma } from "@/server/db/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export interface IncomeReportFilters {
  termId?: string;
  class?: string;
}

export async function getIncomeReport(filters: IncomeReportFilters = {}) {
  const term = filters.termId
    ? await prisma.academicTerm.findUnique({ where: { id: filters.termId } })
    : await prisma.academicTerm.findFirst({ where: { isActive: true } });

  if (!term) {
    return {
      termName: "No Term Active",
      totalBilled: "0.00",
      totalCollected: "0.00",
      totalOutstanding: "0.00",
      collectionRate: 100,
      classBreakdowns: [],
    };
  }

  // 1. Fetch fee postings
  const feePostings = await prisma.feePosting.findMany({
    where: {
      termId: term.id,
      ...(filters.class ? { student: { class: filters.class } } : {}),
    },
    include: {
      student: { select: { id: true, class: true } },
    },
  });

  // 2. Fetch payments
  const payments = await prisma.payment.findMany({
    where: {
      status: "SUCCESS",
      student: {
        feePostings: { some: { termId: term.id } },
        ...(filters.class ? { class: filters.class } : {}),
      },
    },
    include: {
      student: { select: { id: true, class: true } },
    },
  });

  // 3. Fetch manual cash credits
  const credits = await prisma.manualCredit.findMany({
    where: {
      student: {
        feePostings: { some: { termId: term.id } },
        ...(filters.class ? { class: filters.class } : {}),
      },
    },
    include: {
      student: { select: { id: true, class: true } },
    },
  });

  // Class-based aggregation maps
  const classBilledMap = new Map<string, Decimal>();
  const classCollectedMap = new Map<string, Decimal>();

  let totalCharges = new Decimal(0);
  let totalReversals = new Decimal(0);

  for (const post of feePostings) {
    const cls = post.student.class;
    const currentBilled = classBilledMap.get(cls) || new Decimal(0);

    if (post.type === "CHARGE") {
      totalCharges = totalCharges.add(post.amount);
      classBilledMap.set(cls, currentBilled.add(post.amount));
    } else if (post.type === "REVERSAL") {
      totalReversals = totalReversals.add(post.amount);
      classBilledMap.set(cls, currentBilled.sub(post.amount));
    }
  }

  const totalBilled = totalCharges.sub(totalReversals);
  let totalCollected = new Decimal(0);

  for (const pay of payments) {
    const cls = pay.student.class;
    totalCollected = totalCollected.add(pay.amount);
    const curr = classCollectedMap.get(cls) || new Decimal(0);
    classCollectedMap.set(cls, curr.add(pay.amount));
  }

  for (const cred of credits) {
    const cls = cred.student.class;
    totalCollected = totalCollected.add(cred.amount);
    const curr = classCollectedMap.get(cls) || new Decimal(0);
    classCollectedMap.set(cls, curr.add(cred.amount));
  }

  const totalOutstanding = totalBilled.sub(totalCollected);
  const collectionRate = totalBilled.gt(0)
    ? totalCollected.mul(100).div(totalBilled).toDecimalPlaces(2).toNumber()
    : 100;

  // Build class breakdowns
  const allClasses = Array.from(
    new Set([...classBilledMap.keys(), ...classCollectedMap.keys()]),
  ).sort();

  const classBreakdowns = allClasses.map((className) => {
    const billed = classBilledMap.get(className) || new Decimal(0);
    const collected = classCollectedMap.get(className) || new Decimal(0);
    const outstanding = billed.sub(collected);
    const rate = billed.gt(0)
      ? collected.mul(100).div(billed).toDecimalPlaces(2).toNumber()
      : 100;

    return {
      className,
      billed: billed.toString(),
      collected: collected.toString(),
      outstanding: outstanding.toString(),
      collectionRate: rate,
    };
  });

  return {
    termName: term.name,
    totalBilled: totalBilled.toString(),
    totalCollected: totalCollected.toString(),
    totalOutstanding: totalOutstanding.toString(),
    collectionRate,
    classBreakdowns,
  };
}
