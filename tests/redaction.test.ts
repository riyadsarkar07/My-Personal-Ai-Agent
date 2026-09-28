import assert from "node:assert/strict";
import { test } from "node:test";
import { redactSecrets } from "../lib/utils";

test("redacts live api keys and bearer tokens", () => {
  const text = redactSecrets("key=uag_live_abc123 Authorization: Bearer tok_secret");
  assert.equal(text.includes("uag_live_abc123"), false);
  assert.equal(text.includes("tok_secret"), false);
  assert.match(text, /REDACTED/);
});
