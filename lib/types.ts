import { GEMINI_MODELS as CATALOG_GEMINI_MODELS } from "./ai/catalog";

export type UserRole = "owner" | "admin" | "member";
export type ProjectStatus = "active" | "archived";
export type AgentStatus = "active" | "disabled";
export type ApiKeyStatus = "active" | "revoked";
export type MessageRole = "user" | "assistant" | "system" | "tool";
export type MembershipRole = "owner" | "admin" | "developer" | "viewer";
export type ToolExecutionMode = "sandbox" | "deny";
export type ProviderId = "gemini" | "openai" | "anthropic" | "groq" | "openrouter";
export type CredentialStatus = "active" | "disabled" | "invalid";
export type MemoryScope = "project" | "agent";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  password_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  rate_limit_rpm: number;
  rate_limit_rpd: number;
  max_tokens_per_request: number;
  status: ProjectStatus;
  allowed_origins: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: MembershipRole;
  created_at: string;
}

export interface Agent {
  id: string;
  project_id: string;
  name: string;
  description: string;
  model: string;
  fallback_models: string[];
  system_instruction: string;
  temperature: number;
  max_tokens: number;
  memory_enabled: boolean;
  tools_enabled: boolean;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
}

export interface AgentTool {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  parameters_schema: Record<string, unknown>;
  enabled: boolean;
  execution_mode: ToolExecutionMode;
  created_at: string;
}

export interface ApiKeyRecord {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  permissions: string[];
  status: ApiKeyStatus;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  agent_id: string;
  title: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  token_count: number;
  created_at: string;
}

export interface UsageLog {
  id: string;
  project_id: string;
  agent_id: string | null;
  api_key_id: string | null;
  conversation_id: string | null;
  model: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  latency_ms: number;
  status: "success" | "error" | "rate_limited" | "unauthorized";
  error: string | null;
  path: string;
  created_at: string;
}

export interface ProviderCredential {
  id: string;
  provider: ProviderId;
  label: string;
  key_prefix: string;
  key_ciphertext: string;
  status: CredentialStatus;
  last_validated_at: string | null;
  last_error: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface RoutingPolicy {
  id: string;
  project_id: string | null;
  name: string;
  primary_model: string;
  fallback_models: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface FailoverLog {
  id: string;
  project_id: string | null;
  agent_id: string | null;
  provider: string;
  model: string;
  status: "success" | "error" | "skipped";
  error_code: string | null;
  error: string | null;
  latency_ms: number;
  retryable: boolean;
  created_at: string;
}

export interface MemoryRecord {
  id: string;
  project_id: string;
  agent_id: string | null;
  key: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  project_id: string | null;
  action: string;
  resource: string;
  metadata: Record<string, unknown>;
  ip: string | null;
  created_at: string;
}

export interface SessionPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export const GEMINI_MODELS = CATALOG_GEMINI_MODELS;

export type GeminiModel = (typeof GEMINI_MODELS)[number];

export const DEFAULT_PERMISSIONS = [
  "chat",
  "agents:read",
  "conversations:read",
  "usage:read",
] as const;

export const ALL_PERMISSIONS = [
  "chat",
  "agents:read",
  "agents:write",
  "conversations:read",
  "conversations:write",
  "usage:read",
] as const;
