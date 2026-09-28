import { defaultFallbackModels, estimateCostUsd, inferProvider, modelsCompatible, type ProviderId } from "./catalog";
import { cooldownMsFor, errorFromUnknown, GatewayError, isRetryableCode } from "./errors";
import { getAdapter } from "./providers";
import { INJECTION_GUARD, type EngineInput, type EngineResult, type FailoverAttempt, type NormalizedRequest } from "./types";
import { redactSecrets } from "../utils";

const MAX_ATTEMPTS = 4;
const SAME_MODEL_RETRIES = 1;
const REQUEST_TIMEOUT_MS = 25_000;

export interface ResolvedCredential {
  provider: ProviderId;
  apiKey: string;
  credentialId?: string | null;
}

export interface RoutePlan {
  models: string[];
  maxAttempts: number;
}

export interface GatewayDeps {
  resolveCredential: (provider: ProviderId) => Promise<ResolvedCredential | null>;
  getAdapter?: typeof getAdapter;
  logFailover?: (attempt: FailoverAttempt & { projectId?: string; agentId?: string }) => Promise<void>;
  isCoolingDown?: (provider: ProviderId, model: string) => boolean;
  markCooldown?: (provider: ProviderId, model: string, ms: number) => void;
  sleep?: (ms: number) => Promise<void>;
}

const cooldowns = new Map<string, number>();

export function cooldownKey(provider: ProviderId, model: string) {
  return `${provider}:${model}`;
}

export function isCoolingDown(provider: ProviderId, model: string): boolean {
  const until = cooldowns.get(cooldownKey(provider, model)) ?? 0;
  return until > Date.now();
}

export function markCooldown(provider: ProviderId, model: string, ms: number) {
  if (ms <= 0) return;
  cooldowns.set(cooldownKey(provider, model), Date.now() + ms);
}

export function __resetCooldowns() {
  cooldowns.clear();
}

export function buildContents(input: EngineInput) {
  const history = input.agent.memory_enabled
    ? input.history.filter((m) => m.role === "user" || m.role === "assistant").slice(-24)
    : [];
  return {
    system: `${input.agent.system_instruction}\n\n${INJECTION_GUARD}`,
    messages: [
      ...history.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
      { role: "user" as const, content: input.userMessage },
    ],
  };
}

export function buildRoutePlan(primary: string, fallbacks: string[] | undefined, toolsEnabled: boolean): RoutePlan {
  const seen = new Set<string>();
  const models: string[] = [];
  for (const model of [primary, ...(fallbacks ?? []), ...defaultFallbackModels(primary)]) {
    if (!model || seen.has(model)) continue;
    if (models.length && !modelsCompatible(primary, model, toolsEnabled)) continue;
    seen.add(model);
    models.push(model);
  }
  return { models, maxAttempts: Math.min(MAX_ATTEMPTS, models.length + SAME_MODEL_RETRIES) };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(signal?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

export async function executeGateway(
  input: EngineInput,
  options: {
    fallbacks?: string[];
    stream?: boolean;
    onChunk?: (text: string) => void;
    deps: GatewayDeps;
    projectId?: string;
  },
): Promise<EngineResult> {
  const primary = input.agent.model;
  const plan = buildRoutePlan(primary, options.fallbacks, input.agent.tools_enabled);
  const requestBase: Omit<NormalizedRequest, "model"> = {
    contents: buildContents(input),
    temperature: input.temperature ?? input.agent.temperature,
    maxTokens: input.maxTokens ?? input.agent.max_tokens,
    tools: input.tools,
    toolsEnabled: input.agent.tools_enabled,
  };

  const attempts: FailoverAttempt[] = [];
  let lastError: GatewayError | null = null;
  let streamed = false;
  const sleep = options.deps.sleep ?? delay;
  const cooling = options.deps.isCoolingDown ?? isCoolingDown;
  const setCool = options.deps.markCooldown ?? markCooldown;

  let modelIndex = 0;
  let sameModelTries = 0;

  while (attempts.length < plan.maxAttempts && modelIndex < plan.models.length) {
    const model = plan.models[modelIndex];
    const provider = inferProvider(model);

    if (cooling(provider, model)) {
      attempts.push({
        provider,
        model,
        status: "skipped",
        error: "cooling down",
        latencyMs: 0,
        retryable: true,
        errorCode: "rate_limit",
      });
      modelIndex += 1;
      sameModelTries = 0;
      continue;
    }

    const credential = await options.deps.resolveCredential(provider);
    if (!credential?.apiKey) {
      attempts.push({
        provider,
        model,
        status: "error",
        error: `No ${provider} credential configured`,
        latencyMs: 0,
        retryable: true,
        errorCode: "auth",
      });
      modelIndex += 1;
      sameModelTries = 0;
      continue;
    }

    const adapter = (options.deps.getAdapter ?? getAdapter)(provider);
    const started = Date.now();
    const timeout = withTimeout();
    try {
      const result = options.stream && options.onChunk
        ? await adapter.stream(
            credential.apiKey,
            { ...requestBase, model },
            (chunk) => {
              streamed = true;
              options.onChunk?.(chunk);
            },
            timeout.signal,
          )
        : await adapter.generate(credential.apiKey, { ...requestBase, model }, timeout.signal);

      const attempt: FailoverAttempt = {
        provider,
        model: result.model || model,
        status: "success",
        latencyMs: Date.now() - started,
      };
      attempts.push(attempt);
      if (options.deps.logFailover && attempts.length > 1) {
        await options.deps.logFailover({ ...attempt, projectId: options.projectId, agentId: input.agent.id });
      }
      return {
        text: result.text,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        model: result.model || model,
        provider,
        failover: attempts,
        estimatedCostUsd: estimateCostUsd(result.model || model, result.usage.promptTokens, result.usage.completionTokens),
      };
    } catch (error) {
      const gw = errorFromUnknown(error).withContext(provider, model);
      lastError = gw;
      const attempt: FailoverAttempt = {
        provider,
        model,
        status: "error",
        error: redactSecrets(gw.message),
        errorCode: gw.code,
        latencyMs: Date.now() - started,
        retryable: gw.retryable,
      };
      attempts.push(attempt);
      if (options.deps.logFailover) {
        await options.deps.logFailover({ ...attempt, projectId: options.projectId, agentId: input.agent.id });
      }

      if (streamed) {
        throw gw;
      }

      const cool = cooldownMsFor(gw.code);
      if (cool) setCool(provider, model, cool);

      const canRetrySame = sameModelTries < SAME_MODEL_RETRIES && isRetryableCode(gw.code, true) && gw.code !== "quota";
      if (canRetrySame) {
        sameModelTries += 1;
        await sleep(Math.min(400 * sameModelTries, 800));
      } else {
        if (!isRetryableCode(gw.code, false) && gw.code !== "auth") {
          throw gw;
        }
        modelIndex += 1;
        sameModelTries = 0;
      }
    } finally {
      timeout.cancel();
    }
  }

  throw lastError ?? new GatewayError("No eligible models available", { status: 503, code: "unknown", retryable: false });
}
