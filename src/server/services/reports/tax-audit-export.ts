// src/server/services/reports/tax-audit-export.ts
// Tax Auditor Multi-Sheet Excel Export Engine with 25s Timeout Fallback
// Locked per Module I2, Rule PERF-2, and excel-export skill

import ExcelJS from "exceljs";
import { format } from "date-fns";
import { schoolConfig } from "@/../../school.config";
import { prisma } from "@/server/db/prisma";
import { reportsQueue } from "@/server/jobs/queues";
import { computeBatchOutstandingBalances } from "@/server/services/balance";
import { Decimal } from "@prisma/client/runtime/library";

const TIMEOUT_MS = 25_000;

export interface TaxAuditExportParams {
  termId?: string;
  requestingUserId: string;
  requestingUserEmail: string;
}

export type TaxAuditExportResult =
  | { type: "buffer"; buffer: Buffer; fileName: string }
  | { type: "deferred"; message: string };

export async function handleTaxAuditExportRequest(
  params: TaxAuditExportParams,
): Promise<TaxAuditExportResult> {
  const generatePromise = buildTaxAuditWorkbook(params.termId);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("EXPORT_TIMEOUT")), TIMEOUT_MS),
  );

  try {
    const result = await Promise.race([generatePromise, timeoutPromise]);
    return { type: "buffer", buffer: result.buffer, fileName: result.fileName };
  } catch (err) {
    if (err instanceof Error && err.message === "EXPORT_TIMEOUT") {
      // Step 8 & 10: Hand off to BullMQ worker on timeout (Rule PERF-2 / §I2-AC8)
      await reportsQueue.add("generate-tax-export", {
        termId: params.termId,
        requestingUserId: params.requestingUserId,
        requestingUserEmail: params.requestingUserEmail,
      });

      return {
        type: "deferred",
        message:
          "Your export is taking longer than expected. We will email it to you within 5 minutes.",
      };
    }
    throw err;
  }
}

export async function buildTaxAuditWorkbook(termId?: string): Promise<{
  buffer: Buffer;
  fileName: string;
}> {
  const term = termId
    ? await prisma.academicTerm.findUnique({ where: { id: termId } })
    : await prisma.academicTerm.findFirst({ where: { isActive: true } });

  if (!term) {
    throw new Error("No academic term found for tax audit export");
  }

  const [postings, payments, credits, students] = await Promise.all([
    prisma.feePosting.findMany({
      where: { termId: term.id },
      include: { student: true, feeStructure: true, postedBy: true },
      orderBy: { postedAt: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        student: { feePostings: { some: { termId: term.id } } },
      },
      include: { student: true, receipt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.manualCredit.findMany({
      where: {
        receipt: { student: { feePostings: { some: { termId: term.id } } } },
      },
      include: { student: true, recordedBy: true, receipt: true },
      orderBy: { recordedAt: "asc" },
    }),
    prisma.student.findMany({
      where: { isActive: true },
      orderBy: [{ class: "asc" }, { lastName: "asc" }],
    }),
  ]);

  const studentIds = students.map((s) => s.id);
  const balanceMap = await computeBatchOutstandingBalances(studentIds, term.id);

  // Totals calculations
  let totalCharges = new Decimal(0);
  let totalReversals = new Decimal(0);
  for (const p of postings) {
    if (p.type === "CHARGE") totalCharges = totalCharges.add(p.amount);
    if (p.type === "REVERSAL") totalReversals = totalReversals.add(p.amount);
  }
  const totalBilled = totalCharges.sub(totalReversals);

  let totalCardCollected = new Decimal(0);
  for (const p of payments) {
    totalCardCollected = totalCardCollected.add(p.amount);
  }

  let totalCashCollected = new Decimal(0);
  for (const c of credits) {
    totalCashCollected = totalCashCollected.add(c.amount);
  }

  const totalCollected = totalCardCollected.add(totalCashCollected);
  const totalOutstanding = totalBilled.sub(totalCollected);
  const collectionRate = totalBilled.gt(0)
    ? totalCollected.mul(100).div(totalBilled).toDecimalPlaces(2).toNumber()
    : 100;

  // Build ExcelJS Workbook
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Summary (Locked order: Step 3)
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric / Header", key: "metric", width: 35 },
    { header: "Value", key: "value", width: 35 },
  ];
  const summaryHeader = summarySheet.getRow(1);
  summaryHeader.font = { bold: true };
  summaryHeader.commit();

  summarySheet.addRow({ metric: "School Name", value: schoolConfig.name });
  summarySheet.addRow({ metric: "Academic Term", value: term.name });
  summarySheet.addRow({
    metric: "Term Period",
    value: `${format(term.startDate, "dd/MM/yyyy")} - ${format(term.endDate, "dd/MM/yyyy")}`,
  });
  summarySheet.addRow({
    metric: "Total Fee Obligations Posted (NGN)",
    value: totalBilled.toNumber(),
  });
  summarySheet.addRow({
    metric: "Total Collections - Online Card (NGN)",
    value: totalCardCollected.toNumber(),
  });
  summarySheet.addRow({
    metric: "Total Collections - Bursary Cash (NGN)",
    value: totalCashCollected.toNumber(),
  });
  summarySheet.addRow({
    metric: "Net Verified Revenue Collected (NGN)",
    value: totalCollected.toNumber(),
  });
  summarySheet.addRow({
    metric: "Total Outstanding Receivables (NGN)",
    value: totalOutstanding.toNumber(),
  });
  summarySheet.addRow({
    metric: "Collection Rate (%)",
    value: `${collectionRate}%`,
  });

  // Apply currency formatting to numeric cells
  for (let r = 5; r <= 9; r++) {
    const cell = summarySheet.getCell(`B${r}`);
    cell.numFmt = "#,##0.00";
  }

  // Sheet 2: Fee Income Detail
  const detailSheet = workbook.addWorksheet("Fee Income Detail");
  detailSheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Student Name", key: "studentName", width: 25 },
    { header: "Admission Number", key: "admissionNumber", width: 20 },
    { header: "Class", key: "class", width: 15 },
    { header: "Payment Method", key: "method", width: 18 },
    { header: "Amount (NGN)", key: "amount", width: 20 },
    { header: "Receipt / Ref Number", key: "reference", width: 25 },
    { header: "Recorded / Verified By", key: "recordedBy", width: 25 },
  ];
  const detailHeader = detailSheet.getRow(1);
  detailHeader.font = { bold: true };
  detailHeader.commit();

  detailSheet.getColumn("amount").numFmt = "#,##0.00";
  detailSheet.getColumn("date").numFmt = "DD/MM/YYYY";

  // Add card collections
  for (const pay of payments) {
    detailSheet.addRow({
      date: pay.createdAt,
      studentName: `${pay.student.firstName} ${pay.student.lastName}`,
      admissionNumber: pay.student.admissionNumber,
      class: pay.student.class,
      method: "ONLINE_CARD",
      amount: pay.amount.toNumber(),
      reference: pay.receipt?.receiptNumber || pay.flutterwaveRef || pay.internalRef,
      recordedBy: "Flutterwave Gateway",
    });
  }

  // Add cash credits
  for (const cred of credits) {
    detailSheet.addRow({
      date: cred.recordedAt,
      studentName: `${cred.student.firstName} ${cred.student.lastName}`,
      admissionNumber: cred.student.admissionNumber,
      class: cred.student.class,
      method: "BURSARY_CASH",
      amount: cred.amount.toNumber(),
      reference: cred.receipt?.receiptNumber || cred.referenceNote || cred.id,
      recordedBy: `${cred.recordedBy.firstName} ${cred.recordedBy.lastName}`,
    });
  }

  // Sheet 3: Outstanding Balances
  const balancesSheet = workbook.addWorksheet("Outstanding Balances");
  balancesSheet.columns = [
    { header: "Student Name", key: "studentName", width: 25 },
    { header: "Admission Number", key: "admissionNumber", width: 20 },
    { header: "Class", key: "class", width: 15 },
    { header: "Credit Balance / Surplus (NGN)", key: "creditBalance", width: 25 },
    { header: "Net Outstanding Balance (NGN)", key: "outstandingBalance", width: 25 },
  ];
  const balancesHeader = balancesSheet.getRow(1);
  balancesHeader.font = { bold: true };
  balancesHeader.commit();

  balancesSheet.getColumn("creditBalance").numFmt = "#,##0.00";
  balancesSheet.getColumn("outstandingBalance").numFmt = "#,##0.00";

  for (const st of students) {
    const bal = balanceMap.get(st.id) || new Decimal(0);
    balancesSheet.addRow({
      studentName: `${st.firstName} ${st.lastName}`,
      admissionNumber: st.admissionNumber,
      class: st.class,
      creditBalance: st.creditBalance.toNumber(),
      outstandingBalance: bal.toNumber(),
    });
  }

  const dateStr = format(new Date(), "yyyyMMdd");
  const cleanTermName = term.name.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `${schoolConfig.name}_FinancialReport_${cleanTermName}_${dateStr}.xlsx`;

  const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  return { buffer: Buffer.from(buffer), fileName };
}
