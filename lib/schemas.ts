import { z } from "zod";
import { PROVIDER_IDS } from "./ai/catalog";
import { ALL_PERMISSIONS as KEY_PERMISSIONS } from "./types";

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(32_000),
  agentId: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional(),
  stream: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(16).max(8192).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const modelId = z.string().min(1).max(120);

export const createAgentSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().default(""),
  model: modelId.optional(),
  fallbackModels: z.array(modelId).max(8).optional().default([]),
  systemInstruction: z.string().max(16_000).optional().default("You are a helpful AI agent."),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().int().min(16).max(8192).optional().default(2048),
  memoryEnabled: z.boolean().optional().default(true),
  toolsEnabled: z.boolean().optional().default(false),
  projectId: z.string().min(1).optional(),
});

export const updateAgentSchema = createAgentSchema.partial();

export const createProjectSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().default(""),
  rateLimitRpm: z.number().int().min(1).max(10_000).optional().default(60),
  rateLimitRpd: z.number().int().min(1).max(1_000_000).optional().default(10_000),
  maxTokensPerRequest: z.number().int().min(16).max(8192).optional().default(4096),
  allowedOrigins: z.array(z.string()).optional().default([]),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(["active", "archived"]).optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(80),
  projectId: z.string().min(1).optional(),
  permissions: z.array(z.enum(KEY_PERMISSIONS)).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const providerCredentialSchema = z.object({
  provider: z.enum(PROVIDER_IDS),
  label: z.string().min(1).max(80),
  apiKey: z.string().min(8).max(512),
  priority: z.number().int().min(0).max(100).optional(),
});

export const updateProviderCredentialSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  apiKey: z.string().min(8).max(512).optional(),
  status: z.enum(["active", "disabled", "invalid"]).optional(),
  priority: z.number().int().min(0).max(100).optional(),
});

export const routingPolicySchema = z.object({
  name: z.string().min(1).max(80),
  projectId: z.string().min(1).optional().nullable(),
  primaryModel: modelId,
  fallbackModels: z.array(modelId).max(8).optional().default([]),
  enabled: z.boolean().optional().default(true),
});

export const memorySchema = z.object({
  projectId: z.string().min(1),
  agentId: z.string().min(1).optional().nullable(),
  key: z.string().min(1).max(120),
  content: z.string().min(1).max(8_000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(160)
  .regex(/^[^\s@]+@[^\s@]+$/, "Invalid email");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const registerSchema = loginSchema.extend({
  fullName: z.string().min(1).max(80),
});

export const playgroundChatSchema = chatRequestSchema.extend({
  agentId: z.string().min(1),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
