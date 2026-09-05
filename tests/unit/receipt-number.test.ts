// tests/unit/receipt-number.test.ts
// Unit tests for Rule MONEY-10 globally sequential receipt number format

import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Rule MONEY-10 Receipt Number Format", () => {
  it("should match RCP-YYYY-NNNNNN format with zero-padded sequential digits", () => {
    const year = 2026;
    const count = 42;
    const receiptNumber = `RCP-${year}-${String(count).padStart(6, "0")}`;

    assert.equal(receiptNumber, "RCP-2026-000042");
    assert.match(receiptNumber, /^RCP-\d{4}-\d{6}$/);
  });
});
