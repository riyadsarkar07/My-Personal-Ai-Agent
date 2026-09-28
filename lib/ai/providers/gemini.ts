import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { executeTool, toGeminiDeclarations } from "../tools";
import { GatewayError, errorFromUnknown } from "../errors";
import type { NormalizedRequest, NormalizedResult, ProviderAdapter, ProviderHealth, StreamHandler } from "../types";

function extractText(response: GenerateContentResponse): string {
  const text = response.text;
  if (text) return text;
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("");
}

function usage(response: GenerateContentResponse) {
  return {
    promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

function contentsOf(request: NormalizedRequest) {
  return request.contents.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

function wrapGeminiError(error: unknown): never {
  const gw = errorFromUnknown(error);
  const lower = gw.message.toLowerCase();
  if (lower.includes("resource_exhausted") || lower.includes("429")) {
    throw new GatewayError(gw.message, { status: 429, code: "rate_limit", retryable: true, provider: "gemini" });
  }
  if (lower.includes("quota") || lower.includes("billing")) {
    throw new GatewayError(gw.message, { status: 403, code: "quota", retryable: true, provider: "gemini" });
  }
  throw gw.withContext("gemini", "");
}

export const geminiAdapter: ProviderAdapter = {
  id: "gemini",
  async generate(apiKey, request, signal) {
    if (!apiKey) {
      throw new GatewayError("GEMINI_API_KEY is not configured", {
        status: 503,
        code: "auth",
        retryable: false,
        provider: "gemini",
      });
    }
    const ai = new GoogleGenAI({ apiKey });
    const contents = contentsOf(request);
    const declarations = request.toolsEnabled ? toGeminiDeclarations(request.tools) : [];
    const config = {
      systemInstruction: request.contents.system,
      temperature: request.temperature,
      maxOutputTokens: request.maxTokens,
      tools: declarations.length ? [{ functionDeclarations: declarations }] : undefined,
    };

    try {
      let response = await ai.models.generateContent({
        model: request.model,
        contents,
        config,
        abortSignal: signal,
      } as never);

      const calls = response.functionCalls ?? [];
      if (calls.length && request.toolsEnabled) {
        const functionResponses = [];
        for (const call of calls) {
          const args = (call.args ?? {}) as Record<string, unknown>;
          const executed = await executeTool(call.name ?? "", args, true);
          functionResponses.push({
            name: call.name,
            response: { result: executed.result, ok: executed.ok },
          });
        }
        response = await ai.models.generateContent({
          model: request.model,
          contents: [
            ...contents,
            { role: "model", parts: (response.candidates?.[0]?.content?.parts as never) ?? [] },
            {
              role: "user",
              parts: functionResponses.map((fr) => ({ functionResponse: fr })),
            },
          ],
          config,
          abortSignal: signal,
        } as never);
      }

      const stats = usage(response);
      return {
        text: extractText(response) || "I could not generate a response.",
        usage: stats,
        model: request.model,
        provider: "gemini",
      } satisfies NormalizedResult;
    } catch (error) {
      wrapGeminiError(error);
    }
  },
  async stream(apiKey, request, onChunk: StreamHandler, signal) {
    if (!apiKey) {
      throw new GatewayError("GEMINI_API_KEY is not configured", {
        status: 503,
        code: "auth",
        retryable: false,
        provider: "gemini",
      });
    }
    const ai = new GoogleGenAI({ apiKey });
    const contents = contentsOf(request);
    try {
      const stream = await ai.models.generateContentStream({
        model: request.model,
        contents,
        config: {
          systemInstruction: request.contents.system,
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
        },
        abortSignal: signal,
      } as never);
      let text = "";
      let promptTokens = 0;
      let completionTokens = 0;
      for await (const chunk of stream) {
        if (signal.aborted) {
          throw new GatewayError("Provider request timed out", { status: 504, code: "timeout", retryable: true });
        }
        const piece = chunk.text ?? "";
        if (piece) {
          text += piece;
          onChunk(piece);
        }
        promptTokens = chunk.usageMetadata?.promptTokenCount ?? promptTokens;
        completionTokens = chunk.usageMetadata?.candidatesTokenCount ?? completionTokens;
      }
      return {
        text: text || "I could not generate a response.",
        usage: { promptTokens, completionTokens },
        model: request.model,
        provider: "gemini",
      };
    } catch (error) {
      wrapGeminiError(error);
    }
  },
  async health(apiKey): Promise<ProviderHealth> {
    const started = Date.now();
    if (!apiKey) {
      return { ok: false, latencyMs: 0, message: "No API key configured" };
    }
    try {
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        config: { maxOutputTokens: 8, temperature: 0 },
      });
      return { ok: true, latencyMs: Date.now() - started, message: "Reachable" };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  },
};
