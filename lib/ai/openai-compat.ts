import type { ProviderId } from "./catalog";
import { GatewayError, errorFromHttp, errorFromUnknown } from "./errors";
import { fetchJson, jsonHeaders, readSse } from "./http";
import type { NormalizedRequest, ProviderAdapter } from "./types";

interface OpenAiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function toMessages(request: NormalizedRequest): OpenAiMessage[] {
  return [
    { role: "system", content: request.contents.system },
    ...request.contents.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];
}

function usageOf(json: Record<string, unknown>) {
  const usage = (json.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number };
  return {
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
  };
}

export function createOpenAiCompatAdapter(opts: {
  id: ProviderId;
  baseUrl: string;
  extraHeaders?: (apiKey: string) => Record<string, string>;
}): ProviderAdapter {
  const endpoint = `${opts.baseUrl.replace(/\/$/, "")}/chat/completions`;

  function headers(apiKey: string): HeadersInit {
    return jsonHeaders(apiKey, opts.extraHeaders?.(apiKey));
  }

  function body(request: NormalizedRequest, stream: boolean) {
    return {
      model: request.model,
      messages: toMessages(request),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream,
    };
  }

  return {
    id: opts.id,
    async generate(apiKey, request, signal) {
      const { json } = await fetchJson(
        endpoint,
        {
          method: "POST",
          headers: headers(apiKey),
          body: JSON.stringify(body(request, false)),
          signal,
        },
        25_000,
      );
      const payload = json as {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
        model?: string;
      };
      const text = payload.choices?.[0]?.message?.content ?? "";
      const usage = usageOf(json as Record<string, unknown>);
      return {
        text: text || "I could not generate a response.",
        usage,
        model: payload.model || request.model,
        provider: opts.id,
        finishReason: payload.choices?.[0]?.finish_reason,
      };
    },
    async stream(apiKey, request, onChunk, signal) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", () => controller.abort(), { once: true });
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: headers(apiKey),
          body: JSON.stringify(body(request, true)),
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
          if (data === "[DONE]") break;
          let parsed: {
            choices?: { delta?: { content?: string } }[];
            model?: string;
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }
          const piece = parsed.choices?.[0]?.delta?.content ?? "";
          if (piece) {
            text += piece;
            onChunk(piece);
          }
          if (parsed.model) model = parsed.model;
          if (parsed.usage) {
            promptTokens = parsed.usage.prompt_tokens ?? promptTokens;
            completionTokens = parsed.usage.completion_tokens ?? completionTokens;
          }
        }
        return {
          text: text || "I could not generate a response.",
          usage: { promptTokens, completionTokens },
          model,
          provider: opts.id,
        };
      } catch (error) {
        throw errorFromUnknown(error);
      } finally {
        clearTimeout(timer);
      }
    },
    async health(apiKey) {
      const started = Date.now();
      try {
        const { json } = await fetchJson(
          `${opts.baseUrl.replace(/\/$/, "")}/models`,
          { method: "GET", headers: headers(apiKey) },
          8_000,
        );
        const payload = json as { data?: unknown[]; error?: { message?: string } };
        if (payload.error?.message) {
          throw new GatewayError(payload.error.message, { status: 502, code: "server_error", retryable: true });
        }
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
}

export function assertKey(apiKey: string, provider: ProviderId) {
  if (!apiKey) {
    throw new GatewayError(`${provider} API key is not configured`, {
      status: 503,
      code: "auth",
      retryable: false,
      provider,
    });
  }
}
