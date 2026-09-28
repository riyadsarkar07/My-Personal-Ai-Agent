import { redactSecrets } from "../utils";
import type { ProviderId } from "./catalog";

export type ProviderErrorCode =
  | "rate_limit"
  | "quota"
  | "server_error"
  | "network"
  | "timeout"
  | "auth"
  | "invalid_request"
  | "content_filter"
  | "unknown";

export class GatewayError extends Error {
  status: number;
  code: ProviderErrorCode;
  retryable: boolean;
  provider?: ProviderId;
  model?: string;

  constructor(
    message: string,
    opts: {
      status?: number;
      code?: ProviderErrorCode;
      retryable?: boolean;
      provider?: ProviderId;
      model?: string;
    } = {},
  ) {
    super(redactSecrets(message).slice(0, 400));
    this.name = "GatewayError";
    this.status = opts.status ?? 500;
    this.code = opts.code ?? "unknown";
    this.retryable = opts.retryable ?? false;
    this.provider = opts.provider;
    this.model = opts.model;
  }

  withContext(provider: ProviderId, model: string): GatewayError {
    this.provider = provider;
    this.model = model;
    return this;
  }
}

export function isRetryableCode(code: ProviderErrorCode, sameModel: boolean): boolean {
  if (code === "rate_limit" || code === "quota") return !sameModel || code === "rate_limit";
  if (code === "server_error" || code === "network" || code === "timeout") return true;
  return false;
}

export function cooldownMsFor(code: ProviderErrorCode): number {
  switch (code) {
    case "rate_limit":
      return 15_000;
    case "quota":
      return 60_000;
    case "server_error":
      return 5_000;
    case "timeout":
    case "network":
      return 2_000;
    default:
      return 0;
  }
}

export function errorFromHttp(status: number, body: string): GatewayError {
  const lower = redactSecrets(body).toLowerCase();
  const snippet = redactSecrets(body).replace(/\s+/g, " ").slice(0, 220);

  if (status === 429 || lower.includes("rate limit") || lower.includes("too many requests")) {
    return new GatewayError(`Provider rate limit: ${snippet}`, {
      status: 429,
      code: "rate_limit",
      retryable: true,
    });
  }
  if (
    lower.includes("quota") ||
    lower.includes("billing") ||
    lower.includes("insufficient_quota") ||
    lower.includes("exceeded your current quota")
  ) {
    return new GatewayError(`Provider quota exhausted: ${snippet}`, {
      status: status || 403,
      code: "quota",
      retryable: true,
    });
  }
  if (status === 401 || (status === 403 && !lower.includes("quota"))) {
    return new GatewayError(`Provider authentication failed: ${snippet}`, {
      status,
      code: "auth",
      retryable: false,
    });
  }
  if (lower.includes("content") && (lower.includes("filter") || lower.includes("safety") || lower.includes("policy"))) {
    return new GatewayError(`Provider content filter: ${snippet}`, {
      status: status || 400,
      code: "content_filter",
      retryable: false,
    });
  }
  if (status === 400 || status === 404 || status === 422) {
    return new GatewayError(`Provider rejected the request: ${snippet}`, {
      status,
      code: "invalid_request",
      retryable: false,
    });
  }
  if (status === 408 || status === 504) {
    return new GatewayError("Provider request timed out", {
      status,
      code: "timeout",
      retryable: true,
    });
  }
  if (status >= 500) {
    return new GatewayError(`Provider server error (${status}): ${snippet}`, {
      status,
      code: "server_error",
      retryable: true,
    });
  }
  return new GatewayError(`Provider error (${status}): ${snippet}`, {
    status,
    code: "unknown",
    retryable: false,
  });
}

export function errorFromUnknown(error: unknown): GatewayError {
  if (error instanceof GatewayError) return error;
  if (error && typeof error === "object" && (error as { name?: string }).name === "AbortError") {
    return new GatewayError("Provider request timed out", { status: 504, code: "timeout", retryable: true });
  }
  const message = error instanceof Error ? error.message : "Unknown provider error";
  const status = (error as { status?: number })?.status;
  const lower = message.toLowerCase();
  if (lower.includes("timed out") || lower.includes("timeout")) {
    return new GatewayError(message, { status: 504, code: "timeout", retryable: true });
  }
  if (lower.includes("fetch") || lower.includes("network") || lower.includes("econnreset")) {
    return new GatewayError(message, { status: 503, code: "network", retryable: true });
  }
  if (typeof status === "number") return errorFromHttp(status, message);
  return new GatewayError(message, { status: 500, code: "unknown", retryable: false });
}
