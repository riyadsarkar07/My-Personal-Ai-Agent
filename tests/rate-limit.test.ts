import assert from "node:assert/strict";
import { test } from "node:test";
import { consumeRateLimit } from "../lib/rate-limit";

test("rate limiter allows up to the limit then blocks", () => {
  const key = `test-${Date.now()}`;
  const first = consumeRateLimit(key, 2, 60_000);
  const second = consumeRateLimit(key, 2, 60_000);
  const third = consumeRateLimit(key, 2, 60_000);
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
});
