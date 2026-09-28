import { errorFromHttp, errorFromUnknown, GatewayError } from "./errors";
import { redactSecrets } from "../utils";

export async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs = 25_000,
): Promise<{ status: number; json: unknown; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const parent = init.signal;
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener("abort", () => controller.abort(), { once: true });
  }
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let json: unknown = {};
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text.slice(0, 400) };
      }
    }
    if (!response.ok) {
      throw errorFromHttp(response.status, text);
    }
    return { status: response.status, json, text };
  } catch (error) {
    throw errorFromUnknown(error);
  } finally {
    clearTimeout(timer);
  }
}

export async function* readSse(response: Response): AsyncGenerator<string> {
  if (!response.body) throw new GatewayError("Empty stream body", { status: 502, code: "server_error", retryable: true });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;
      if (trimmed.startsWith("data:")) {
        yield trimmed.slice(5).trim();
      }
    }
  }
  if (buffer.trim().startsWith("data:")) {
    yield buffer.trim().slice(5).trim();
  }
}

export function jsonHeaders(apiKey: string, extra?: Record<string, string>): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export function clipError(value: unknown): string {
  if (typeof value === "string") return redactSecrets(value).slice(0, 280);
  try {
    return redactSecrets(JSON.stringify(value)).slice(0, 280);
  } catch {
    return "Provider error";
  }
}
