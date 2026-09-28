export const PROVIDER_IDS = ["gemini", "openai", "anthropic", "groq", "openrouter"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export interface ModelDefinition {
  id: string;
  provider: ProviderId;
  displayName: string;
  streaming: boolean;
  tools: boolean;
  contextWindow: number;
  maxOutput: number;
  pricing: ModelPricing;
}

export const CATALOG_MODELS: ModelDefinition[] = [
  {
    id: "gemini-2.0-flash",
    provider: "gemini",
    displayName: "Gemini 2.0 Flash",
    streaming: true,
    tools: true,
    contextWindow: 1_000_000,
    maxOutput: 8192,
    pricing: { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  },
  {
    id: "gemini-2.0-flash-lite",
    provider: "gemini",
    displayName: "Gemini 2.0 Flash Lite",
    streaming: true,
    tools: true,
    contextWindow: 1_000_000,
    maxOutput: 8192,
    pricing: { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  },
  {
    id: "gemini-2.5-flash",
    provider: "gemini",
    displayName: "Gemini 2.5 Flash",
    streaming: true,
    tools: true,
    contextWindow: 1_000_000,
    maxOutput: 8192,
    pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  },
  {
    id: "gemini-2.5-pro",
    provider: "gemini",
    displayName: "Gemini 2.5 Pro",
    streaming: true,
    tools: true,
    contextWindow: 1_000_000,
    maxOutput: 8192,
    pricing: { inputPerMillion: 1.25, outputPerMillion: 10 },
  },
  {
    id: "gemini-1.5-flash",
    provider: "gemini",
    displayName: "Gemini 1.5 Flash",
    streaming: true,
    tools: true,
    contextWindow: 1_000_000,
    maxOutput: 8192,
    pricing: { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  },
  {
    id: "gemini-1.5-pro",
    provider: "gemini",
    displayName: "Gemini 1.5 Pro",
    streaming: true,
    tools: true,
    contextWindow: 2_000_000,
    maxOutput: 8192,
    pricing: { inputPerMillion: 1.25, outputPerMillion: 5 },
  },
  {
    id: "gpt-4o",
    provider: "openai",
    displayName: "GPT-4o",
    streaming: true,
    tools: true,
    contextWindow: 128_000,
    maxOutput: 16384,
    pricing: { inputPerMillion: 2.5, outputPerMillion: 10 },
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    displayName: "GPT-4o mini",
    streaming: true,
    tools: true,
    contextWindow: 128_000,
    maxOutput: 16384,
    pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  },
  {
    id: "gpt-4.1",
    provider: "openai",
    displayName: "GPT-4.1",
    streaming: true,
    tools: true,
    contextWindow: 1_047_576,
    maxOutput: 32768,
    pricing: { inputPerMillion: 2, outputPerMillion: 8 },
  },
  {
    id: "gpt-4.1-mini",
    provider: "openai",
    displayName: "GPT-4.1 mini",
    streaming: true,
    tools: true,
    contextWindow: 1_047_576,
    maxOutput: 32768,
    pricing: { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  },
  {
    id: "o4-mini",
    provider: "openai",
    displayName: "o4-mini",
    streaming: true,
    tools: false,
    contextWindow: 200_000,
    maxOutput: 100_000,
    pricing: { inputPerMillion: 1.1, outputPerMillion: 4.4 },
  },
  {
    id: "claude-sonnet-4-20250514",
    provider: "anthropic",
    displayName: "Claude Sonnet 4",
    streaming: true,
    tools: true,
    contextWindow: 200_000,
    maxOutput: 16384,
    pricing: { inputPerMillion: 3, outputPerMillion: 15 },
  },
  {
    id: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    displayName: "Claude 3.5 Sonnet",
    streaming: true,
    tools: true,
    contextWindow: 200_000,
    maxOutput: 8192,
    pricing: { inputPerMillion: 3, outputPerMillion: 15 },
  },
  {
    id: "claude-3-5-haiku-20241022",
    provider: "anthropic",
    displayName: "Claude 3.5 Haiku",
    streaming: true,
    tools: true,
    contextWindow: 200_000,
    maxOutput: 8192,
    pricing: { inputPerMillion: 0.8, outputPerMillion: 4 },
  },
  {
    id: "claude-3-haiku-20240307",
    provider: "anthropic",
    displayName: "Claude 3 Haiku",
    streaming: true,
    tools: true,
    contextWindow: 200_000,
    maxOutput: 4096,
    pricing: { inputPerMillion: 0.25, outputPerMillion: 1.25 },
  },
  {
    id: "llama-3.3-70b-versatile",
    provider: "groq",
    displayName: "Llama 3.3 70B",
    streaming: true,
    tools: true,
    contextWindow: 128_000,
    maxOutput: 32768,
    pricing: { inputPerMillion: 0.59, outputPerMillion: 0.79 },
  },
  {
    id: "llama-3.1-8b-instant",
    provider: "groq",
    displayName: "Llama 3.1 8B Instant",
    streaming: true,
    tools: true,
    contextWindow: 128_000,
    maxOutput: 8192,
    pricing: { inputPerMillion: 0.05, outputPerMillion: 0.08 },
  },
  {
    id: "mixtral-8x7b-32768",
    provider: "groq",
    displayName: "Mixtral 8x7B",
    streaming: true,
    tools: false,
    contextWindow: 32768,
    maxOutput: 8192,
    pricing: { inputPerMillion: 0.24, outputPerMillion: 0.24 },
  },
  {
    id: "gemma2-9b-it",
    provider: "groq",
    displayName: "Gemma 2 9B",
    streaming: true,
    tools: false,
    contextWindow: 8192,
    maxOutput: 8192,
    pricing: { inputPerMillion: 0.2, outputPerMillion: 0.2 },
  },
  {
    id: "openai/gpt-4o-mini",
    provider: "openrouter",
    displayName: "OpenRouter GPT-4o mini",
    streaming: true,
    tools: true,
    contextWindow: 128_000,
    maxOutput: 16384,
    pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    provider: "openrouter",
    displayName: "OpenRouter Claude 3.5 Sonnet",
    streaming: true,
    tools: true,
    contextWindow: 200_000,
    maxOutput: 8192,
    pricing: { inputPerMillion: 3, outputPerMillion: 15 },
  },
  {
    id: "google/gemini-2.0-flash-001",
    provider: "openrouter",
    displayName: "OpenRouter Gemini 2.0 Flash",
    streaming: true,
    tools: true,
    contextWindow: 1_000_000,
    maxOutput: 8192,
    pricing: { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    provider: "openrouter",
    displayName: "OpenRouter Llama 3.3 70B",
    streaming: true,
    tools: true,
    contextWindow: 128_000,
    maxOutput: 32768,
    pricing: { inputPerMillion: 0.59, outputPerMillion: 0.79 },
  },
];

const MODEL_INDEX = new Map(CATALOG_MODELS.map((model) => [model.id, model]));

export const GEMINI_MODELS = CATALOG_MODELS.filter((m) => m.provider === "gemini").map((m) => m.id);

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  groq: "Groq",
  openrouter: "OpenRouter",
};

export function getModelDef(id: string): ModelDefinition | undefined {
  return MODEL_INDEX.get(id);
}

export function isKnownModel(id: string): boolean {
  if (MODEL_INDEX.has(id)) return true;
  if (id.length > 0 && id.length < 120 && id.includes("/")) return true;
  return /^(gemini-|gpt-|o[1-4]-|chatgpt-|claude-|llama-|mixtral-|gemma)/.test(id);
}

export function inferProvider(model: string): ProviderId {
  const known = MODEL_INDEX.get(model);
  if (known) return known.provider;
  if (model.startsWith("gemini")) return "gemini";
  if (
    model.startsWith("gpt-") ||
    model.startsWith("o1-") ||
    model.startsWith("o3-") ||
    model.startsWith("o4-") ||
    model.startsWith("chatgpt-")
  ) {
    return "openai";
  }
  if (model.startsWith("claude")) return "anthropic";
  if (model.includes("/")) return "openrouter";
  return "groq";
}

export function modelsCompatible(from: string, to: string, requireTools: boolean): boolean {
  if (from === to) return true;
  const a = getModelDef(from);
  const b = getModelDef(to);
  if (requireTools && b && !b.tools) return false;
  if (requireTools && !b) return false;
  if (a && b) return true;
  return isKnownModel(to);
}

export function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const def = getModelDef(model);
  if (!def) return 0;
  const cost =
    (promptTokens / 1_000_000) * def.pricing.inputPerMillion +
    (completionTokens / 1_000_000) * def.pricing.outputPerMillion;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function defaultFallbackModels(primary: string): string[] {
  const provider = inferProvider(primary);
  const pool = [
    "gemini-2.0-flash",
    "gpt-4o-mini",
    "claude-3-5-haiku-20241022",
    "llama-3.1-8b-instant",
    "openai/gpt-4o-mini",
  ];
  return pool.filter((id) => id !== primary && modelsCompatible(primary, id, false)).filter((id) => {
    return inferProvider(id) !== provider || id !== primary;
  });
}
