import { executeGateway, type GatewayDeps } from "./gateway";
import { recordFailoverAttempt, resolveProviderCredential } from "../store";
import { redactSecrets } from "../utils";
import { estimateCostUsd, inferProvider } from "./catalog";
import type { EngineInput, EngineResult } from "./types";

export type { EngineInput, EngineResult } from "./types";

const defaultDeps: GatewayDeps = {
  resolveCredential: resolveProviderCredential,
  logFailover: recordFailoverAttempt,
};

export async function generateReply(input: EngineInput, projectId?: string): Promise<EngineResult> {
  try {
    return await executeGateway(input, {
      fallbacks: input.agent.fallback_models ?? [],
      deps: defaultDeps,
      projectId,
    });
  } catch (error) {
    const preview = redactSecrets(input.userMessage).slice(0, 180);
    const message = error instanceof Error ? error.message : "Unknown error";
    if (/not configured|No .* credential/i.test(message)) {
      return {
        text: `No live provider is configured. Add a provider API key in Settings or set GEMINI_API_KEY / OPENAI_API_KEY. Echo: ${preview}`,
        promptTokens: 0,
        completionTokens: 0,
        model: input.agent.model,
        provider: inferProvider(input.agent.model),
        estimatedCostUsd: 0,
      };
    }
    throw error;
  }
}

export async function streamReply(
  input: EngineInput,
  onChunk: (text: string) => void,
  projectId?: string,
): Promise<EngineResult> {
  try {
    return await executeGateway(input, {
      fallbacks: input.agent.fallback_models ?? [],
      stream: true,
      onChunk,
      deps: defaultDeps,
      projectId,
    });
  } catch (error) {
    const preview = redactSecrets(input.userMessage).slice(0, 180);
    const message = error instanceof Error ? error.message : "Unknown error";
    if (/not configured|No .* credential/i.test(message)) {
      const text = `No live provider is configured. Add a provider API key in Settings. Echo: ${preview}`;
      onChunk(text);
      return {
        text,
        promptTokens: 0,
        completionTokens: 0,
        model: input.agent.model,
        provider: inferProvider(input.agent.model),
        estimatedCostUsd: estimateCostUsd(input.agent.model, 0, 0),
      };
    }
    throw error;
  }
}
