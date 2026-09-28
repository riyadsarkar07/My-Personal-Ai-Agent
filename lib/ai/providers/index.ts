import type { ProviderId } from "../catalog";
import type { ProviderAdapter } from "../types";
import { anthropicAdapter } from "./anthropic";
import { geminiAdapter } from "./gemini";
import { groqAdapter } from "./groq";
import { openaiAdapter } from "./openai";
import { openrouterAdapter } from "./openrouter";

const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  gemini: geminiAdapter,
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  groq: groqAdapter,
  openrouter: openrouterAdapter,
};

export function getAdapter(provider: ProviderId): ProviderAdapter {
  return ADAPTERS[provider];
}

export function listAdapters(): ProviderAdapter[] {
  return Object.values(ADAPTERS);
}
