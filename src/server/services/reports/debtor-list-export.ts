// src/server/services/reports/debtor-list-export.ts
// Debtor List ExcelJS Export Engine (Module H2 / Rule PERF-3 / excel-export skill)

import ExcelJS from "exceljs";
import { format } from "date-fns";
import { schoolConfig } from "@/../../school.config";
import { prisma } from "@/server/db/prisma";
import { computeBatchOutstandingBalances } from "@/server/services/balance";
import { Decimal } from "@prisma/client/runtime/library";

export interface DebtorExportFilters {
  termId?: string;
  class?: string;
  minAmount?: number;
  minOverdueDays?: number;
}

export async function generateDebtorListWorkbook(filters: DebtorExportFilters = {}): Promise<{
  buffer: Buffer;
  fileName: string;
}> {
  // 1. Get active term
  const term = filters.termId
    ? await prisma.academicTerm.findUnique({ where: { id: filters.termId } })
    : await prisma.academicTerm.findFirst({ where: { isActive: true } });

  if (!term) {
    throw new Error("No academic term selected for debtor export");
  }

  // 2. Query students matching filters
  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      ...(filters.class ? { class: filters.class } : {}),
    },
    include: {
      parentLinks: {
        where: { isActive: true },
        include: { parent: true },
      },
      installments: {
        where: { isPaused: true },
      },
      notes: {
        where: { content: { startsWith: "[PAUSED]" } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ class: "asc" }, { lastName: "asc" }],
  });

  // 3. Batch compute balances
  const studentIds = students.map((s) => s.id);
  const balanceMap = await computeBatchOutstandingBalances(studentIds, term.id);

  // 4. Calculate overdue days relative to term due date
  const now = new Date();
  const dueDate = term.paymentDueDate || term.startDate;
  const isOverdue = now > dueDate;
  const diffTime = Math.abs(now.getTime() - dueDate.getTime());
  const calculatedOverdueDays = isOverdue ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

  // 5. Filter debtors with balance > 0
  const debtorRows = students
    .map((student) => {
      const balance = balanceMap.get(student.id) || new Decimal(0);
      const parent = student.parentLinks[0]?.parent;
      const isPaused = student.installments.length > 0 || student.notes.length > 0;

      return {
        student,
        balance,
        parent,
        isPaused,
        overdueDays: calculatedOverdueDays,
      };
    })
    .filter((d) => {
      if (d.balance.lte(0)) return false;
      if (filters.minAmount && d.balance.lt(filters.minAmount)) return false;
      if (filters.minOverdueDays && d.overdueDays < filters.minOverdueDays) return false;
      return true;
    });

  // 6. Build ExcelJS Workbook
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Debtor List");

  // Define columns
  sheet.columns = [
    { header: "Student Name", key: "studentName", width: 25 },
    { header: "Admission Number", key: "admissionNumber", width: 20 },
    { header: "Class", key: "class", width: 15 },
    { header: "Outstanding Balance (NGN)", key: "balance", width: 25 },
    { header: "Days Overdue", key: "overdueDays", width: 15 },
    { header: "Parent / Guardian", key: "parentName", width: 25 },
    { header: "Parent Phone", key: "parentPhone", width: 18 },
    { header: "Parent Email", key: "parentEmail", width: 25 },
    { header: "Account Status", key: "status", width: 15 },
  ];

  // Bold header row (PRD §H2-AC4 / excel-export skill Step 4)
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.commit();

  // Column formatting (Step 5)
  sheet.getColumn("balance").numFmt = "#,##0.00";
  sheet.getColumn("overdueDays").numFmt = "0";

  // Add data rows (Step 6: .toNumber() used strictly inside addRow)
  for (const item of debtorRows) {
    sheet.addRow({
      studentName: `${item.student.firstName} ${item.student.lastName}`,
      admissionNumber: item.student.admissionNumber,
      class: item.student.class,
      balance: item.balance.toNumber(),
      overdueDays: item.overdueDays,
      parentName: item.parent ? `${item.parent.firstName} ${item.parent.lastName}` : "Unlinked",
      parentPhone: item.parent?.phone || "N/A",
      parentEmail: item.parent?.email || "N/A",
      status: item.isPaused ? "Paused" : item.overdueDays > 0 ? "Overdue" : "Pending",
    });
  }

  // Step 7: Locked filename convention
  const dateStr = format(new Date(), "yyyyMMdd");
  const fileName = `${schoolConfig.name}_DebtorList_${dateStr}.xlsx`;

  const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  return { buffer: Buffer.from(buffer), fileName };
}
