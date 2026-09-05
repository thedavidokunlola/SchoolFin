// tests/unit/encryption.test.ts
// Unit tests for AES-256-GCM encryption/decryption of PII (Rule SEC-1, PAY-5)

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { encrypt, decrypt } from "../../src/server/services/encryption";

describe("AES-256-GCM Encryption Service", () => {
  it("should encrypt and decrypt strings correctly", () => {
    const rawPhoneNumber = "+2348012345678";
    const encrypted = encrypt(rawPhoneNumber);

    assert.notEqual(encrypted, rawPhoneNumber);
    assert.ok(typeof encrypted === "string" && encrypted.length > 20, "Encrypted string should be base64 ciphertext");

    const decrypted = decrypt(encrypted);
    assert.equal(decrypted, rawPhoneNumber);
  });

  it("should return different ciphertexts for the same plaintext due to random IV", () => {
    const text = "confidential-card-token-12345";
    const enc1 = encrypt(text);
    const enc2 = encrypt(text);

    assert.notEqual(enc1, enc2);
    assert.equal(decrypt(enc1), decrypt(enc2));
  });
});
