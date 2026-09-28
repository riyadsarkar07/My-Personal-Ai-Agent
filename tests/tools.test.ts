import assert from "node:assert/strict";
import { test } from "node:test";
import { executeTool } from "../lib/ai/tools";

test("calculator evaluates arithmetic", async () => {
  const result = await executeTool("calculator", { expression: "(2+3)*4" }, true);
  assert.equal(result.ok, true);
  assert.equal(result.result, "20");
});

test("calculator rejects non-arithmetic input", async () => {
  const result = await executeTool("calculator", { expression: "process.exit(1)" }, true);
  assert.equal(result.ok, false);
});

test("unknown or disabled tools are denied", async () => {
  const unknown = await executeTool("shell", { cmd: "ls" }, true);
  const disabled = await executeTool("calculator", { expression: "1+1" }, false);
  assert.equal(unknown.ok, false);
  assert.equal(disabled.ok, false);
});
