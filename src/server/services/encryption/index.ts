// src/server/services/encryption/index.ts
// AES-256-GCM application-layer encryption
// Locked per encryption.md and PRD §6.6

import crypto from "crypto";
import { config } from "@/lib/config";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const rawKey = config.encryption.key || "";
  // If 64 hex characters, convert from hex -> 32 bytes
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }
  // If exactly 32-byte utf-8 string
  if (Buffer.byteLength(rawKey, "utf8") === 32) {
    return Buffer.from(rawKey, "utf8");
  }
  // Otherwise, derive a consistent 32-byte key using sha256 hash
  return crypto
    .createHash("sha256")
    .update(rawKey || config.auth.secret || "schoolfin-default-encryption-key-seed")
    .digest();
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
