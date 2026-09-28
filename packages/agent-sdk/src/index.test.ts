import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentSDKError, UniversalAgent } from "./index";

test("chat sends bearer token and returns typed payload", async () => {
  const agent = new UniversalAgent({
    baseURL: "https://example.test/api/v1",
    apiKey: "uag_live_testkey",
    fetch: async (input, init) => {
      assert.equal(String(input), "https://example.test/api/v1/chat");
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("authorization"), "Bearer uag_live_testkey");
      return new Response(
        JSON.stringify({
          data: {
            id: "msg_1",
            conversationId: "cnv_1",
            agentId: "agt_1",
            message: "Hello",
            model: "gemini-2.0-flash",
            usage: { promptTokens: 4, completionTokens: 2 },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });
  const response = await agent.chat({ message: "Hi" });
  assert.equal(response.message, "Hello");
  assert.equal(response.conversationId, "cnv_1");
});

test("listModels hits /models", async () => {
  const agent = new UniversalAgent({
    baseURL: "https://example.test/api/v1",
    apiKey: "uag_live_testkey",
    fetch: async (input) => {
      assert.equal(String(input), "https://example.test/api/v1/models");
      return new Response(JSON.stringify({ data: [{ id: "gpt-4o-mini", provider: "openai" }] }), { status: 200 });
    },
  });
  const models = await agent.listModels();
  assert.equal((models as { id: string }[])[0].id, "gpt-4o-mini");
});

test("unauthorized responses become AgentSDKError", async () => {
  const agent = new UniversalAgent({
    baseURL: "https://example.test/api/v1",
    apiKey: "uag_live_bad",
    fetch: async () =>
      new Response(JSON.stringify({ error: { message: "Invalid API key", status: 401 } }), { status: 401 }),
  });
  await assert.rejects(() => agent.chat({ message: "Hi" }), (err: unknown) => {
    assert.ok(err instanceof AgentSDKError);
    assert.equal(err.status, 401);
    return true;
  });
});
