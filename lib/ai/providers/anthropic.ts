import { GatewayError, errorFromHttp, errorFromUnknown } from "../errors";
import { fetchJson, readSse } from "../http";
import type { NormalizedRequest, NormalizedResult, ProviderAdapter, StreamHandler } from "../types";

const BASE = "https://api.anthropic.com/v1";

function headers(apiKey: string): HeadersInit {
  return {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  };
}

function bodyOf(request: NormalizedRequest, stream: boolean) {
  return {
    model: request.model,
    max_tokens: request.maxTokens,
    temperature: request.temperature,
    system: request.contents.system,
    stream,
    messages: request.contents.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };
}

function textFromContent(content: unknown): string {
  if (!Array.isArray(content)) return typeof content === "string" ? content : "";
  return content
    .map((part) => {
      if (part && typeof part === "object" && (part as { type?: string }).type === "text") {
        return String((part as { text?: string }).text ?? "");
      }
      return "";
    })
    .join("");
}

export const anthropicAdapter: ProviderAdapter = {
  id: "anthropic",
  async generate(apiKey, request, signal) {
    if (!apiKey) {
      throw new GatewayError("ANTHROPIC_API_KEY is not configured", {
        status: 503,
        code: "auth",
        retryable: false,
        provider: "anthropic",
      });
    }
    const { json } = await fetchJson(
      `${BASE}/messages`,
      {
        method: "POST",
        headers: headers(apiKey),
        body: JSON.stringify(bodyOf(request, false)),
        signal,
      },
      25_000,
    );
    const payload = json as {
      content?: unknown;
      model?: string;
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    return {
      text: textFromContent(payload.content) || "I could not generate a response.",
      usage: {
        promptTokens: payload.usage?.input_tokens ?? 0,
        completionTokens: payload.usage?.output_tokens ?? 0,
      },
      model: payload.model || request.model,
      provider: "anthropic",
      finishReason: payload.stop_reason,
    } satisfies NormalizedResult;
  },
  async stream(apiKey, request, onChunk: StreamHandler, signal) {
    if (!apiKey) {
      throw new GatewayError("ANTHROPIC_API_KEY is not configured", {
        status: 503,
        code: "auth",
        retryable: false,
        provider: "anthropic",
      });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
    try {
      const response = await fetch(`${BASE}/messages`, {
        method: "POST",
        headers: headers(apiKey),
        body: JSON.stringify(bodyOf(request, true)),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw errorFromHttp(response.status, await response.text());
      }
      let text = "";
      let promptTokens = 0;
      let completionTokens = 0;
      let model = request.model;
      for await (const data of readSse(response)) {
        let parsed: {
          type?: string;
          delta?: { text?: string };
          message?: { model?: string; usage?: { input_tokens?: number; output_tokens?: number } };
          usage?: { output_tokens?: number };
        };
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          text += parsed.delta.text;
          onChunk(parsed.delta.text);
        }
        if (parsed.message?.model) model = parsed.message.model;
        if (parsed.message?.usage) {
          promptTokens = parsed.message.usage.input_tokens ?? promptTokens;
          completionTokens = parsed.message.usage.output_tokens ?? completionTokens;
        }
        if (parsed.usage?.output_tokens) completionTokens = parsed.usage.output_tokens;
      }
      return {
        text: text || "I could not generate a response.",
        usage: { promptTokens, completionTokens },
        model,
        provider: "anthropic",
      };
    } catch (error) {
      throw errorFromUnknown(error);
    } finally {
      clearTimeout(timer);
    }
  },
  async health(apiKey) {
    const started = Date.now();
    if (!apiKey) return { ok: false, latencyMs: 0, message: "No API key configured" };
    try {
      const { json } = await fetchJson(
        `${BASE}/models`,
        { method: "GET", headers: headers(apiKey) },
        8_000,
      );
      const payload = json as { data?: unknown[]; error?: { message?: string } };
      return {
        ok: true,
        latencyMs: Date.now() - started,
        message: Array.isArray(payload.data) ? `${payload.data.length} models reachable` : "Reachable",
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  },
};
