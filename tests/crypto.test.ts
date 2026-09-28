import assert from "node:assert/strict";
import { test } from "node:test";
import { generateApiKey, hashApiKey, hashPassword, verifyPassword } from "../lib/crypto";

test("api keys are unique and hashed", () => {
  const a = generateApiKey();
  const b = generateApiKey();
  assert.notEqual(a.raw, b.raw);
  assert.match(a.raw, /^uag_live_/);
  assert.equal(hashApiKey(a.raw), hashApiKey(a.raw));
  assert.notEqual(hashApiKey(a.raw), hashApiKey(b.raw));
  assert.equal(a.prefix, a.raw.slice(0, 16));
});

test("password hashes verify and reject mismatches", () => {
  const stored = hashPassword("ChangeMe123!");
  assert.equal(verifyPassword("ChangeMe123!", stored), true);
  assert.equal(verifyPassword("wrong-password", stored), false);
});
