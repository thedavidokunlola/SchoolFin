---
name: excel-export
description: >
  Load this skill when you hear: "export to Excel", "generate the xlsx", "download the debtor list",
  "build the tax audit export", "create the Excel report", "ExcelJS", "generate the spreadsheet".
  Applies to every task that produces an .xlsx file: debtor list export (Module H2)
  and tax audit export (Module I2).
---

## What this skill does
Teaches the ordered steps to build a compliant ExcelJS export for SchoolFin.
The laws live in: PRD §H2, §I2, `stack-lock.md` (ExcelJS is locked),
`performance-requirements.md` (timing targets are requirements),
`bullmq-jobs.md` (generate-tax-export job), `money-handling.md` (Decimal formatting).
This skill does not restate those laws. It teaches the assembly order.

---

## Procedure

### Step 1 — Confirm which export is being built and load its spec
Two exports exist. Read the correct PRD module before writing any code.

| Export | PRD module | Sheets | Timeout | Queue fallback |
|---|---|---|---|---|
| Debtor list | §H2 | 1 sheet | None — must complete in 5 sec | None |
| Tax audit | §I2 | 3 sheets | 25 seconds server-side | `generate-tax-export` BullMQ job |

For the tax audit export, also read the `generate-tax-export` row in `bullmq-jobs.md`.

### Step 2 — Install and import ExcelJS
ExcelJS is the only permitted Excel library per `stack-lock.md`.
SheetJS, xlsx, and any other Excel library are forbidden even as a supplementary dependency.

```typescript
import ExcelJS from "exceljs";
```

### Step 3 — Create the workbook and add sheets in the correct order
Sheet names must match the PRD specification exactly.
For the tax audit export, three sheets in this order: Summary, Fee Income Detail, Outstanding Balances.
For the debtor list export, one sheet.

```typescript
const workbook = new ExcelJS.Workbook();
const summarySheet = workbook.addWorksheet("Summary");
const detailSheet = workbook.addWorksheet("Fee Income Detail");
const balancesSheet = workbook.addWorksheet("Outstanding Balances");
```

### Step 4 — Define column headers and apply bold formatting
Add headers as the first row. Apply bold styling to every header cell.
Do this before adding data rows.

```typescript
detailSheet.columns = [
  { header: "Date", key: "date", width: 15 },
  { header: "Student Name", key: "studentName", width: 25 },
  { header: "Admission Number", key: "admissionNumber", width: 20 },
  { header: "Class", key: "class", width: 15 },
  { header: "Payment Method", key: "method", width: 18 },
  { header: "Amount (NGN)", key: "amount", width: 18 },
  { header: "Reference Number", key: "reference", width: 22 },
  { header: "Recorded By", key: "recordedBy", width: 20 },
];

// Bold the header row
const headerRow = detailSheet.getRow(1);
headerRow.font = { bold: true };
headerRow.commit();
```

### Step 5 — Apply number formats to currency and date columns
Currency columns: `#,##0.00` — applied to the column, not per cell.
Date columns: `DD/MM/YYYY` — applied to the column, not per cell.
Per PRD §H2-AC4 and §I2-AC5.

```typescript
// Apply formats to columns by key
detailSheet.getColumn("amount").numFmt = "#,##0.00";
detailSheet.getColumn("date").numFmt = "DD/MM/YYYY";
```

### Step 6 — Add data rows
Convert all monetary Decimal values to numbers only at this serialisation boundary.
This is the one permitted use of `.toNumber()` on a monetary Decimal per `money-handling.md` Rule 1.
Pass JavaScript `Date` objects for date cells — do not pass pre-formatted strings.
ExcelJS applies the `numFmt` format to the value, not to a string.

```typescript
for (const row of dataRows) {
  detailSheet.addRow({
    date: row.paidAt,                              // Date object — not a string
    studentName: `${row.firstName} ${row.lastName}`,
    admissionNumber: row.admissionNumber,
    class: row.class,
    method: row.method,
    amount: row.amount.toNumber(),                 // Decimal → number only here
    reference: row.internalRef,
    recordedBy: `${row.recordedBy.firstName} ${row.recordedBy.lastName}`,
  });
}
```

### Step 7 — Name the file using the locked convention
Per PRD §H2-AC3 and §I2-AC6.

```typescript
// Debtor list
const debtorFileName = `${schoolConfig.name}_DebtorList_${format(new Date(), "yyyyMMdd")}.xlsx`;

// Tax audit
const taxFileName = `${schoolConfig.name}_FinancialReport_${termName}_${format(new Date(), "yyyyMMdd")}.xlsx`;
```

School name comes from `schoolConfig.name` in `school.config.ts`. Never hard-coded.

### Step 8 — For the tax audit export: implement the 25-second timeout guard
Per PRD §I2-AC7 and §I2-AC8 and `performance-requirements.md`.

Wrap the synchronous generation in a `Promise.race` with a 25-second timeout.
On timeout, hand off to the `generate-tax-export` BullMQ queue and return the holding message.

```typescript
const TIMEOUT_MS = 25_000;

const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error("EXPORT_TIMEOUT")), TIMEOUT_MS),
);

try {
  const buffer = await Promise.race([generateTaxAuditBuffer(params), timeoutPromise]);
  // send buffer to browser as download
  return buffer;
} catch (err) {
  if (err instanceof Error && err.message === "EXPORT_TIMEOUT") {
    await reportsQueue.add("generate-tax-export", {
      requestingUserId: ctx.session.user.id,
      requestingUserEmail: ctx.session.user.email,
      params,
    });
    return { message: "Your export is taking longer than expected. We will email it to you within 5 minutes." };
  }
  throw err;
}
```

### Step 9 — Write the buffer to the response
Use ExcelJS's `writeBuffer()` to produce a `Buffer` and set the correct
`Content-Type` and `Content-Disposition` headers.

```typescript
const buffer = await workbook.xlsx.writeBuffer();

// In a Next.js route handler:
return new Response(buffer, {
  headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${fileName}"`,
  },
});
```

### Step 10 — For the BullMQ fallback job: email the file as an attachment
The `generate-tax-export` job handler completes the generation and emails the file.
Per PRD §I2-AC8: email it to the requesting user's email address.
Use the `send-email` job in the `notifications` queue — load the `notification-enqueue` skill.

---

## Code skeleton — tax audit export with timeout fallback

```typescript
// src/server/services/reports/generate-tax-audit.ts
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { schoolConfig } from "@/../school.config";
import { prisma } from "@/server/db/prisma";
import { reportsQueue } from "@/server/jobs/queues";

const TIMEOUT_MS = 25_000;

export async function handleTaxAuditExportRequest(
  params: TaxAuditParams,
  requestingUser: { id: string; email: string },
) {
  const generatePromise = buildTaxAuditWorkbook(params);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("EXPORT_TIMEOUT")), TIMEOUT_MS),
  );

  try {
    const buffer = await Promise.race([generatePromise, timeoutPromise]);
    return { type: "buffer" as const, buffer };
  } catch (err) {
    if (err instanceof Error && err.message === "EXPORT_TIMEOUT") {
      await reportsQueue.add("generate-tax-export", {
        requestingUserId: requestingUser.id,
        requestingUserEmail: requestingUser.email,
        params,
      });
      return {
        type: "deferred" as const,
        message: "Your export is taking longer than expected. We will email it to you within 5 minutes.",
      };
    }
    throw err;
  }
}

async function buildTaxAuditWorkbook(params: TaxAuditParams): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "School Name", key: "schoolName", width: 30 },
    { header: "Term", key: "term", width: 20 },
    { header: "Date Range", key: "dateRange", width: 25 },
    { header: "Total Fees (NGN)", key: "totalFees", width: 20 },
    { header: "Total Collected (NGN)", key: "totalCollected", width: 20 },
    { header: "Total Outstanding (NGN)", key: "totalOutstanding", width: 20 },
    { header: "Collection Rate (%)", key: "collectionRate", width: 20 },
  ];
  const summaryHeader = summarySheet.getRow(1);
  summaryHeader.font = { bold: true };
  summaryHeader.commit();
  summarySheet.getColumn("totalFees").numFmt = "#,##0.00";
  summarySheet.getColumn("totalCollected").numFmt = "#,##0.00";
  summarySheet.getColumn("totalOutstanding").numFmt = "#,##0.00";
  // ... add summary data row

  // Sheet 2: Fee Income Detail
  const detailSheet = workbook.addWorksheet("Fee Income Detail");
  detailSheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Student Name", key: "studentName", width: 25 },
    { header: "Admission Number", key: "admissionNumber", width: 20 },
    { header: "Class", key: "class", width: 15 },
    { header: "Payment Method", key: "method", width: 18 },
    { header: "Amount (NGN)", key: "amount", width: 18 },
    { header: "Reference Number", key: "reference", width: 22 },
    { header: "Recorded By", key: "recordedBy", width: 20 },
  ];
  const detailHeader = detailSheet.getRow(1);
  detailHeader.font = { bold: true };
  detailHeader.commit();
  detailSheet.getColumn("amount").numFmt = "#,##0.00";
  detailSheet.getColumn("date").numFmt = "DD/MM/YYYY";
  // ... add data rows

  // Sheet 3: Outstanding Balances
  const balancesSheet = workbook.addWorksheet("Outstanding Balances");
  // ... same pattern

  const fileName = `${schoolConfig.name}_FinancialReport_${params.termName}_${format(new Date(), "yyyyMMdd")}.xlsx`;

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}
```

---

## Traps

**Trap 1 — Using SheetJS, xlsx, or any library other than ExcelJS.**
`stack-lock.md` locks ExcelJS. Any other library is a build failure even if it produces
identical output. Do not add a second Excel library as a "fallback."

**Trap 2 — Passing a pre-formatted string to a date cell.**
ExcelJS applies `numFmt` to a cell value. Passing `"15/03/2025"` as a string
produces a left-aligned text cell, not a date cell the auditor can sort or filter.
Pass a JavaScript `Date` object and let ExcelJS apply `DD/MM/YYYY`.

**Trap 3 — Converting Decimal to number before the addRow call.**
`.toNumber()` is only permitted at the serialisation boundary inside `addRow`.
Do not convert to number in the data-fetching query or the service function.

**Trap 4 — Hard-coding the school name in the file name.**
The file name uses `schoolConfig.name` from `school.config.ts`.
A hard-coded school name prevents the codebase from being reused for a second deployment
per `configuration-and-deployment.md` Rule 1.

**Trap 5 — Forgetting the 25-second timeout on the tax audit export.**
The debtor list has no timeout requirement. The tax audit export does.
Without the timeout guard, a slow query blocks the server connection indefinitely
and the user sees a spinning page, not the handoff message.

**Trap 6 — Not bolding the header row.**
PRD §H2-AC4 and §I2 specify bold column headers.
`workbook.addWorksheet()` does not apply bold by default.
Set `row.font = { bold: true }` and call `row.commit()` explicitly.

**Trap 7 — Applying currency format as a string in the cell value.**
`"₦150,000.00"` as a string in the cell value is not a formatted number.
Set `column.numFmt = "#,##0.00"` and pass a numeric value.
The auditor's Excel formulas will not work on string cells.

**Trap 8 — Missing the BullMQ fallback for tax audit timeout.**
The timeout alone is not sufficient. On timeout, a `generate-tax-export` job must be enqueued
and the user must receive the exact message from PRD §I2-AC8.
Returning a generic error is a failed acceptance criterion.

---

## Verify before done

- [ ] ExcelJS is the only Excel library imported — no SheetJS or xlsx
- [ ] Sheet names match PRD specification exactly
- [ ] Column headers match PRD column lists exactly
- [ ] Header row has `font: { bold: true }` applied and `commit()` called
- [ ] Currency columns have `numFmt = "#,##0.00"`
- [ ] Date columns have `numFmt = "DD/MM/YYYY"` and receive `Date` objects (not strings)
- [ ] All monetary values use `.toNumber()` only inside `addRow` — nowhere earlier
- [ ] File name uses `schoolConfig.name` from `school.config.ts` — never hard-coded
- [ ] Debtor list downloads within 5 seconds for 500 rows (performance requirement)
- [ ] Tax audit export has a 25-second server-side timeout guard
- [ ] On timeout, `generate-tax-export` job is enqueued and the exact PRD §I2-AC8 message is returned
- [ ] `Content-Type` is `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- [ ] `Content-Disposition` header includes the correct filename

**Tests to write:**
- Unit test: file name contains `schoolConfig.name`, correct term name, and today's date in `yyyyMMdd`
- Unit test: header row cells all have `bold: true`
- Unit test: currency column cells contain numeric values with `numFmt = "#,##0.00"`
- Unit test: date column cells contain `Date` objects (not strings)
- Unit test: tax audit generation that exceeds 25 seconds enqueues the BullMQ fallback job
  and returns the exact holding message
- Integration test: generated `.xlsx` file opens without errors and contains the correct
  number of sheets with the correct sheet names
- Integration test: debtor list export for 500 rows completes in under 5 seconds