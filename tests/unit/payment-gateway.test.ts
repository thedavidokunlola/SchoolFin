// tests/unit/payment-gateway.test.ts
// Unit tests for PaymentGateway interface and Flutterwave signature verification

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { FlutterwaveAdapter } from "../../src/server/services/payment-gateway/flutterwave";

describe("PaymentGateway & FlutterwaveAdapter", () => {
  it("should correctly verify valid webhook secret hash (Rule PAY-1)", () => {
    const adapter = new FlutterwaveAdapter();
    const valid = adapter.verifyWebhookSignature("mockhash");
    assert.equal(valid, true);

    const invalid = adapter.verifyWebhookSignature("wrong-hash-value");
    assert.equal(invalid, false);
  });
});
