import assert from "node:assert/strict";
import { test } from "node:test";
import { chatRequestSchema, createAgentSchema } from "../lib/schemas";

test("chat schema requires a message", () => {
  assert.equal(chatRequestSchema.safeParse({}).success, false);
  assert.equal(chatRequestSchema.safeParse({ message: "hello" }).success, true);
});

test("agent schema accepts multi-provider models", () => {
  const parsed = createAgentSchema.safeParse({ name: "bot", model: "gpt-4o", fallbackModels: ["claude-3-5-haiku-20241022"] });
  assert.equal(parsed.success, true);
});
