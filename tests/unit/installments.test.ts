// tests/unit/installments.test.ts
// Unit tests for installment split remainder allocation (exact sums without rounding drift)

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Decimal } from "decimal.js";

describe("Installment Breakdown Calculations", () => {
  it("should split odd totals without rounding loss (remainder in final part)", () => {
    const totalAmount = new Decimal("100000.00");
    const parts = 3;

    const partAmount = totalAmount.div(parts).toDecimalPlaces(2); // 33333.33
    let accumulated = new Decimal(0);
    const installments: Decimal[] = [];

    for (let i = 0; i < parts; i++) {
      if (i === parts - 1) {
        // Last part gets exact remainder
        installments.push(totalAmount.sub(accumulated));
      } else {
        installments.push(partAmount);
        accumulated = accumulated.add(partAmount);
      }
    }

    assert.equal(installments[0].toString(), "33333.33");
    assert.equal(installments[1].toString(), "33333.33");
    assert.equal(installments[2].toString(), "33333.34");

    const sum = installments.reduce((acc, val) => acc.add(val), new Decimal(0));
    assert.equal(sum.toString(), "100000");
  });
});
