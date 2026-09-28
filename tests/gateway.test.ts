import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRoutePlan, executeGateway, __resetCooldowns, type GatewayDeps } from "../lib/ai/gateway";
import { GatewayError } from "../lib/ai/errors";
import { estimateCostUsd, inferProvider, modelsCompatible } from "../lib/ai/catalog";
import type { Agent } from "../lib/types";
import type { NormalizedResult, ProviderAdapter, ProviderHealth } from "../lib/ai/types";
import type { ProviderId } from "../lib/ai/catalog";

const agent: Agent = {
  id: "agt_1",
  project_id: "prj_1",
  name: "Nexus",
  description: "",
  model: "gemini-2.0-flash",
  fallback_models: ["gpt-4o-mini"],
  system_instruction: "You are helpful.",
  temperature: 0.2,
  max_tokens: 256,
  memory_enabled: false,
  tools_enabled: false,
  status: "active",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function stubAdapter(
  id: ProviderId,
  impl: {
    generate?: ProviderAdapter["generate"];
    stream?: ProviderAdapter["stream"];
  },
): ProviderAdapter {
  const fallback: NormalizedResult = {
    text: `${id}-ok`,
    usage: { promptTokens: 1, completionTokens: 1 },
    model: "stub",
    provider: id,
  };
  return {
    id,
    generate: impl.generate ?? (async () => fallback),
    stream: impl.stream ?? (async (_key, _req, onChunk) => {
      onChunk(fallback.text);
      return fallback;
    }),
    health: async (): Promise<ProviderHealth> => ({ ok: true, latencyMs: 1, message: "ok" }),
  };
}

test("route plan includes primary then unique backups", () => {
  const plan = buildRoutePlan("gemini-2.0-flash", ["gpt-4o-mini", "gemini-2.0-flash"], false);
  assert.equal(plan.models[0], "gemini-2.0-flash");
  assert.ok(plan.models.includes("gpt-4o-mini"));
  assert.equal(plan.models.filter((m) => m === "gemini-2.0-flash").length, 1);
});

test("tool-enabled routes skip models that cannot call tools", () => {
  assert.equal(modelsCompatible("gemini-2.0-flash", "o4-mini", true), false);
  const plan = buildRoutePlan("gemini-2.0-flash", ["o4-mini", "gpt-4o-mini"], true);
  assert.equal(plan.models.includes("o4-mini"), false);
  assert.ok(plan.models.includes("gpt-4o-mini"));
});

test("failover skips a rate-limited model and uses the next provider", async () => {
  __resetCooldowns();
  const adapters: Record<string, ProviderAdapter> = {
    gemini: stubAdapter("gemini", {
      generate: async () => {
        throw new GatewayError("rate limit", { status: 429, code: "rate_limit", retryable: true, provider: "gemini" });
      },
    }),
    openai: stubAdapter("openai", {
      generate: async () => ({
        text: "backup-ok",
        usage: { promptTokens: 3, completionTokens: 2 },
        model: "gpt-4o-mini",
        provider: "openai",
      }),
    }),
  };
  const deps: GatewayDeps = {
    resolveCredential: async (provider) => ({ provider, apiKey: `${provider}-key` }),
    getAdapter: (provider) => adapters[provider] ?? stubAdapter(provider, {
      generate: async () => {
        throw new GatewayError("no key", { status: 503, code: "auth", retryable: true, provider });
      },
    }),
    sleep: async () => undefined,
  };
  const result = await executeGateway(
    { agent, tools: [], history: [], userMessage: "hello" },
    { fallbacks: ["gpt-4o-mini"], deps },
  );
  assert.equal(result.text, "backup-ok");
  assert.equal(result.model, "gpt-4o-mini");
  assert.equal(result.provider, "openai");
  assert.ok((result.failover ?? []).some((a) => a.status === "error"));
  assert.ok((result.failover ?? []).some((a) => a.status === "success"));
});

test("streaming errors after first token are not retried", async () => {
  __resetCooldowns();
  let chunks = 0;
  const adapters: Record<string, ProviderAdapter> = {
    gemini: stubAdapter("gemini", {
      stream: async (_key, _req, onChunk) => {
        onChunk("partial");
        chunks += 1;
        throw new GatewayError("rate limit", { status: 429, code: "rate_limit", retryable: true, provider: "gemini" });
      },
    }),
    openai: stubAdapter("openai", {
      stream: async (_key, _req, onChunk) => {
        onChunk("should-not-run");
        return {
          text: "should-not-run",
          usage: { promptTokens: 0, completionTokens: 0 },
          model: "gpt-4o-mini",
          provider: "openai",
        };
      },
    }),
  };
  const deps: GatewayDeps = {
    resolveCredential: async (provider) => ({ provider, apiKey: `${provider}-key` }),
    getAdapter: (provider) => adapters[provider] ?? adapters.gemini,
    sleep: async () => undefined,
  };
  await assert.rejects(
    () =>
      executeGateway(
        { agent, tools: [], history: [], userMessage: "hello" },
        { stream: true, onChunk: () => undefined, fallbacks: ["gpt-4o-mini"], deps },
      ),
    (err: unknown) => err instanceof GatewayError,
  );
  assert.equal(chunks, 1);
});

test("auth failures skip to the next model", async () => {
  __resetCooldowns();
  const deps: GatewayDeps = {
    resolveCredential: async (provider) => {
      if (provider === "gemini") return null;
      if (provider === "openai") return { provider, apiKey: "openai-key" };
      return null;
    },
    getAdapter: (provider) =>
      stubAdapter(provider, {
        generate: async () => ({
          text: "from-openai",
          usage: { promptTokens: 1, completionTokens: 1 },
          model: "gpt-4o-mini",
          provider: "openai",
        }),
      }),
    sleep: async () => undefined,
  };
  const result = await executeGateway(
    { agent, tools: [], history: [], userMessage: "hello" },
    { fallbacks: ["gpt-4o-mini"], deps },
  );
  assert.equal(result.text, "from-openai");
});

test("catalog helpers stay stable", () => {
  assert.equal(inferProvider("gpt-4o-mini"), "openai");
  assert.equal(inferProvider("claude-3-5-haiku-20241022"), "anthropic");
  assert.ok(estimateCostUsd("gpt-4o-mini", 1_000_000, 0) > 0);
});
