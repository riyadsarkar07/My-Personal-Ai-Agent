import { z } from "zod";
import { ALL_PERMISSIONS, GEMINI_MODELS } from "./types";

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(32_000),
  agentId: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional(),
  stream: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(16).max(8192).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAgentSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().default(""),
  model: z.enum(GEMINI_MODELS).optional(),
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
  permissions: z.array(z.enum(ALL_PERMISSIONS)).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email(),
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
