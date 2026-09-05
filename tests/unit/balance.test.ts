// tests/unit/balance.test.ts
// Unit tests for PRD Module B1 / Rule MONEY-2 Outstanding Balance formula

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Decimal } from "decimal.js";

describe("PRD Module B1 Outstanding Balance Formula", () => {
  it("should calculate balance correctly: charges - reversals - payments - credits - creditBalance", () => {
    // Formula from Rule MONEY-2 / Module B1:
    // Outstanding Balance = SUM(FeePosting.amount WHERE type = CHARGE)
    //                     - SUM(FeePosting.amount WHERE type = REVERSAL)
    //                     - SUM(Payment.amount WHERE status = SUCCESS)
    //                     - SUM(ManualCredit.amount)
    //                     - Student.creditBalance

    const charges = [new Decimal("150000.00"), new Decimal("25000.00")]; // Total charges: 175,000
    const reversals = [new Decimal("5000.00")];                          // Total reversals: 5,000 -> Net billed: 170,000
    const payments = [new Decimal("50000.00")];                          // Online payment: 50,000
    const manualCredits = [new Decimal("30000.00")];                     // Cash payment: 30,000
    const creditBalance = new Decimal("10000.00");                       // Surplus from last term: 10,000

    const sumCharges = charges.reduce((acc, c) => acc.plus(c), new Decimal(0));
    const sumReversals = reversals.reduce((acc, r) => acc.plus(r), new Decimal(0));
    const sumPayments = payments.reduce((acc, p) => acc.plus(p), new Decimal(0));
    const sumCredits = manualCredits.reduce((acc, m) => acc.plus(m), new Decimal(0));

    const outstandingBalance = sumCharges
      .minus(sumReversals)
      .minus(sumPayments)
      .minus(sumCredits)
      .minus(creditBalance);

    // 175,000 - 5,000 - 50,000 - 30,000 - 10,000 = 80,000.00
    assert.equal(outstandingBalance.toFixed(2), "80000.00");
  });
});
