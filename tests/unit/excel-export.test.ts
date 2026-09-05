// tests/unit/excel-export.test.ts
// Unit tests for ExcelJS export formatting, rules, and naming conventions

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { schoolConfig } from "../../school.config";
import { Decimal } from "decimal.js";

describe("ExcelJS Export Specifications (Module H2, I2 / excel-export skill)", () => {
  it("should format file names with schoolConfig.name and yyyyMMdd date", () => {
    const todayStr = format(new Date(), "yyyyMMdd");
    const debtorFileName = `${schoolConfig.name}_DebtorList_${todayStr}.xlsx`;
    const taxFileName = `${schoolConfig.name}_FinancialReport_First_Term_${todayStr}.xlsx`;

    assert.ok(debtorFileName.startsWith(schoolConfig.name));
    assert.ok(debtorFileName.endsWith(`${todayStr}.xlsx`));
    assert.ok(taxFileName.includes("FinancialReport"));
  });

  it("should create bold headers and apply number formatting to currency and date columns", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Fee Income Detail");

    sheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Student Name", key: "studentName", width: 25 },
      { header: "Amount (NGN)", key: "amount", width: 20 },
    ];

    // Bold header row (Rule excel-export Step 4)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.commit();

    assert.equal(sheet.getRow(1).font?.bold, true);

    // Number formatting (Rule excel-export Step 5)
    sheet.getColumn("amount").numFmt = "#,##0.00";
    sheet.getColumn("date").numFmt = "DD/MM/YYYY";

    assert.equal(sheet.getColumn("amount").numFmt, "#,##0.00");
    assert.equal(sheet.getColumn("date").numFmt, "DD/MM/YYYY");

    // Add row converting Decimal to number at serialization boundary
    const sampleAmount = new Decimal("75000.50");
    sheet.addRow({
      date: new Date(2026, 8, 15),
      studentName: "Adewale King",
      amount: sampleAmount.toNumber(),
    });

    const dataRow = sheet.getRow(2);
    assert.equal(dataRow.getCell("studentName").value, "Adewale King");
    assert.equal(dataRow.getCell("amount").value, 75000.5);
    assert.ok(dataRow.getCell("date").value instanceof Date);
  });
});
