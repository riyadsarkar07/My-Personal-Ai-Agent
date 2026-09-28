import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptSecret, encryptSecret, secretPrefix } from "../lib/secrets";

test("provider secrets round-trip and never store plaintext prefixes of the full key", () => {
  const raw = "sk-test-super-secret-value-123456";
  const cipher = encryptSecret(raw);
  assert.notEqual(cipher, raw);
  assert.equal(cipher.includes(raw), false);
  assert.equal(decryptSecret(cipher), raw);
  assert.equal(secretPrefix(raw).includes("super-secret-value"), false);
});
