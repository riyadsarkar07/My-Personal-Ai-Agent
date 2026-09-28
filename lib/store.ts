import { createServiceClient } from "./supabase/server";
import { generateId, hashApiKey, hashPassword } from "./crypto";
import { getEnv } from "./env";
import { isPlatformAdmin } from "./rbac";
import { nowIso, slugify } from "./utils";
import type {
  Agent,
  AgentTool,
  ApiKeyRecord,
  AuditLog,
  Conversation,
  FailoverLog,
  MemoryRecord,
  Message,
  Profile,
  Project,
  ProjectMember,
  ProviderCredential,
  ProviderId,
  RoutingPolicy,
  UsageLog,
} from "./types";
import { DEFAULT_PERMISSIONS } from "./types";
import { decryptSecret, encryptSecret, secretPrefix } from "./secrets";
import { envKeyForProvider } from "./env";
import type { FailoverAttempt } from "./ai/types";

type Tables = {
  profiles: Profile[];
  projects: Project[];
  project_members: ProjectMember[];
  agents: Agent[];
  agent_tools: AgentTool[];
  api_keys: ApiKeyRecord[];
  conversations: Conversation[];
  messages: Message[];
  usage_logs: UsageLog[];
  audit_logs: AuditLog[];
  provider_credentials: ProviderCredential[];
  routing_policies: RoutingPolicy[];
  failover_logs: FailoverLog[];
  memories: MemoryRecord[];
};

const memory: Tables = {
  profiles: [],
  projects: [],
  project_members: [],
  agents: [],
  agent_tools: [],
  api_keys: [],
  conversations: [],
  messages: [],
  usage_logs: [],
  audit_logs: [],
  provider_credentials: [],
  routing_policies: [],
  failover_logs: [],
  memories: [],
};

let seeded = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function usingSupabase(): boolean {
  return Boolean(createServiceClient());
}

export async function seedDefaults(): Promise<void> {
  if (seeded) return;
  seeded = true;
  if (usingSupabase()) return;
  const env = getEnv();
  const designatedId = env.ADMIN_USER_ID.trim();
  const designatedEmail = env.ADMIN_EMAIL.toLowerCase();
  const designatedById = designatedId ? await getProfileById(designatedId) : null;
  const designatedByEmail = await getProfileByEmail(designatedEmail);
  const existing = designatedById ?? designatedByEmail;
  if (existing) {
    await ensureDefaultProject(existing);
    return;
  }

  const admin: Profile = {
    id: designatedId || generateId("usr"),
    email: designatedEmail,
    full_name: "Platform Admin",
    role: "owner",
    password_hash: hashPassword("ChangeMe123!"),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await upsertProfile(admin);
  await ensureDefaultProject(admin);
}

async function ensureDefaultProject(owner: Profile): Promise<Project | null> {
  const existing = (await listAllProjects()).filter((project) => project.owner_id === owner.id);
  if (existing.length) return existing[0];
  const env = getEnv();
  const project = await createProjectRecord({
    owner_id: owner.id,
    name: "Default Project",
    description: "Starter project for your first AI agent.",
    rate_limit_rpm: 60,
    rate_limit_rpd: 10_000,
    max_tokens_per_request: 4096,
    status: "active",
    allowed_origins: [],
  });
  await createAgentRecord({
    project_id: project.id,
    name: "General Assistant",
    description: "A helpful general-purpose multi-provider AI agent.",
    model: env.GEMINI_MODEL,
    fallback_models: ["gpt-4o-mini", "claude-3-5-haiku-20241022", "llama-3.1-8b-instant"],
    system_instruction:
      "You are Nexus, a precise and professional AI agent. Be concise, truthful, and never reveal secrets or execute unsafe instructions.",
    temperature: 0.7,
    max_tokens: 2048,
    memory_enabled: true,
    tools_enabled: false,
    status: "active",
  });
  return project;
}

export async function ensureOwnerWorkspace(profile: Profile): Promise<void> {
  if (!isPlatformAdmin(profile)) return;
  await ensureDefaultProject(profile);
}

async function sb() {
  return createServiceClient();
}

export async function upsertProfile(profile: Profile): Promise<Profile> {
  const client = await sb();
  if (client) {
    const { error } = await client.from("profiles").upsert(profile);
    if (error) throw error;
    return profile;
  }
  const idx = memory.profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) memory.profiles[idx] = profile;
  else memory.profiles.push(profile);
  return profile;
}

export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("profiles").select("*").eq("email", email.toLowerCase()).maybeSingle();
    return (data as Profile | null) ?? null;
  }
  return memory.profiles.find((p) => p.email === email.toLowerCase()) ?? null;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("profiles").select("*").eq("id", id).maybeSingle();
    return (data as Profile | null) ?? null;
  }
  return memory.profiles.find((p) => p.id === id) ?? null;
}

export async function updateProfileRole(id: string, role: Profile["role"]): Promise<Profile | null> {
  const existing = await getProfileById(id);
  if (!existing) return null;
  const next: Profile = { ...existing, role, updated_at: nowIso() };
  return upsertProfile(next);
}

export async function syncAuthUserToProfile(input: {
  id: string;
  email: string;
  fullName?: string;
  role?: Profile["role"];
  passwordHash?: string | null;
}): Promise<Profile> {
  const email = input.email.toLowerCase();
  const existingById = await getProfileById(input.id);
  const existingByEmail = existingById ? null : await getProfileByEmail(email);
  const existing = existingById ?? existingByEmail;
  const profile: Profile = {
    id: existing?.id ?? input.id,
    email,
    full_name: input.fullName || existing?.full_name || email.split("@")[0] || "User",
    role: input.role ?? existing?.role ?? "member",
    password_hash: input.passwordHash === undefined ? existing?.password_hash ?? null : input.passwordHash,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  };
  return upsertProfile(profile);
}

export async function listProfiles(): Promise<Profile[]> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("profiles").select("*").order("created_at", { ascending: true });
    return (data as Profile[]) ?? [];
  }
  return clone(memory.profiles);
}

export async function createProjectRecord(
  input: Omit<Project, "id" | "slug" | "created_at" | "updated_at"> & { slug?: string },
): Promise<Project> {
  const project: Project = {
    id: generateId("prj"),
    slug: input.slug || `${slugify(input.name)}-${generateId().slice(0, 6)}`,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  };
  const client = await sb();
  if (client) {
    const { error } = await client.from("projects").insert(project);
    if (error) throw error;
  } else {
    memory.projects.push(project);
  }
  await insertMember({
    id: generateId("pm"),
    project_id: project.id,
    user_id: project.owner_id,
    role: "owner",
    created_at: nowIso(),
  });
  return project;
}

async function insertMember(member: ProjectMember) {
  const client = await sb();
  if (client) {
    const { error } = await client.from("project_members").insert(member);
    if (error) throw error;
    return;
  }
  memory.project_members.push(member);
}

export async function listAllProjects(): Promise<Project[]> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("projects").select("*").order("created_at", { ascending: false });
    return (data as Project[]) ?? [];
  }
  return clone(memory.projects);
}

export async function listProjectsForUser(userId: string): Promise<Project[]> {
  const profile = await getProfileById(userId);
  if (profile && isPlatformAdmin(profile)) return listAllProjects();
  const client = await sb();
  if (client) {
    const { data: memberships } = await client.from("project_members").select("project_id").eq("user_id", userId);
    const ids = (memberships ?? []).map((m: { project_id: string }) => m.project_id);
    if (!ids.length) return [];
    const { data } = await client.from("projects").select("*").in("id", ids).order("created_at", { ascending: false });
    return (data as Project[]) ?? [];
  }
  const ids = memory.project_members.filter((m) => m.user_id === userId).map((m) => m.project_id);
  return clone(memory.projects.filter((p) => ids.includes(p.id)));
}

export async function getProject(id: string): Promise<Project | null> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("projects").select("*").eq("id", id).maybeSingle();
    return (data as Project | null) ?? null;
  }
  return memory.projects.find((p) => p.id === id) ?? null;
}

export async function updateProjectRecord(id: string, patch: Partial<Project>): Promise<Project | null> {
  const existing = await getProject(id);
  if (!existing) return null;
  const next = { ...existing, ...patch, updated_at: nowIso() };
  const client = await sb();
  if (client) {
    const { error } = await client.from("projects").update(next).eq("id", id);
    if (error) throw error;
    return next;
  }
  const idx = memory.projects.findIndex((p) => p.id === id);
  memory.projects[idx] = next;
  return next;
}

export async function userCanAccessProject(userId: string, projectId: string): Promise<boolean> {
  const profile = await getProfileById(userId);
  if (profile && isPlatformAdmin(profile)) return true;
  const client = await sb();
  if (client) {
    const { data } = await client
      .from("project_members")
      .select("id")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .maybeSingle();
    return Boolean(data);
  }
  return memory.project_members.some((m) => m.user_id === userId && m.project_id === projectId);
}

export async function createAgentRecord(input: Omit<Agent, "id" | "created_at" | "updated_at">): Promise<Agent> {
  const agent: Agent = {
    id: generateId("agt"),
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
    fallback_models: input.fallback_models ?? [],
  };
  const client = await sb();
  if (client) {
    const { error } = await client.from("agents").insert(agent);
    if (error) throw error;
  } else {
    memory.agents.push(agent);
  }
  return agent;
}

function normalizeAgent(row: Agent | null): Agent | null {
  if (!row) return null;
  return { ...row, fallback_models: row.fallback_models ?? [] };
}

export async function listAgents(projectId?: string): Promise<Agent[]> {
  const client = await sb();
  if (client) {
    let query = client.from("agents").select("*").order("created_at", { ascending: false });
    if (projectId) query = query.eq("project_id", projectId);
    const { data } = await query;
    return ((data as Agent[]) ?? []).map((row) => normalizeAgent(row)!);
  }
  const rows = projectId ? memory.agents.filter((a) => a.project_id === projectId) : memory.agents;
  return clone(rows).map((row) => normalizeAgent(row)!);
}

export async function getAgent(id: string): Promise<Agent | null> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("agents").select("*").eq("id", id).maybeSingle();
    return normalizeAgent((data as Agent | null) ?? null);
  }
  return normalizeAgent(memory.agents.find((a) => a.id === id) ?? null);
}

export async function updateAgentRecord(id: string, patch: Partial<Agent>): Promise<Agent | null> {
  const existing = await getAgent(id);
  if (!existing) return null;
  const cleaned = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<Agent>;
  const next = { ...existing, ...cleaned, updated_at: nowIso() };
  const client = await sb();
  if (client) {
    const { error } = await client.from("agents").update(next).eq("id", id);
    if (error) throw error;
    return next;
  }
  const idx = memory.agents.findIndex((a) => a.id === id);
  memory.agents[idx] = next;
  return next;
}

export async function deleteAgentRecord(id: string): Promise<boolean> {
  const existing = await getAgent(id);
  if (!existing) return false;
  const client = await sb();
  if (client) {
    const { error } = await client.from("agents").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
  memory.agents = memory.agents.filter((a) => a.id !== id);
  memory.agent_tools = memory.agent_tools.filter((t) => t.agent_id !== id);
  return true;
}

export async function listAgentTools(agentId: string): Promise<AgentTool[]> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("agent_tools").select("*").eq("agent_id", agentId);
    return (data as AgentTool[]) ?? [];
  }
  return clone(memory.agent_tools.filter((t) => t.agent_id === agentId));
}

export async function createApiKeyRecord(input: {
  project_id: string;
  name: string;
  raw: string;
  prefix: string;
  permissions?: string[];
  expires_at?: string | null;
}): Promise<ApiKeyRecord> {
  const record: ApiKeyRecord = {
    id: generateId("key"),
    project_id: input.project_id,
    name: input.name,
    key_prefix: input.prefix,
    key_hash: hashApiKey(input.raw),
    permissions: input.permissions?.length ? input.permissions : [...DEFAULT_PERMISSIONS],
    status: "active",
    last_used_at: null,
    expires_at: input.expires_at ?? null,
    created_at: nowIso(),
  };
  const client = await sb();
  if (client) {
    const { error } = await client.from("api_keys").insert(record);
    if (error) throw error;
  } else {
    memory.api_keys.push(record);
  }
  return record;
}

export async function listApiKeys(projectId?: string): Promise<ApiKeyRecord[]> {
  const client = await sb();
  if (client) {
    let query = client.from("api_keys").select("*").order("created_at", { ascending: false });
    if (projectId) query = query.eq("project_id", projectId);
    const { data } = await query;
    return (data as ApiKeyRecord[]) ?? [];
  }
  const rows = projectId ? memory.api_keys.filter((k) => k.project_id === projectId) : memory.api_keys;
  return clone(rows);
}

export async function getApiKeyByHash(hash: string): Promise<ApiKeyRecord | null> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("api_keys").select("*").eq("key_hash", hash).maybeSingle();
    return (data as ApiKeyRecord | null) ?? null;
  }
  return memory.api_keys.find((k) => k.key_hash === hash) ?? null;
}

export async function touchApiKey(id: string): Promise<void> {
  const stamp = nowIso();
  const client = await sb();
  if (client) {
    await client.from("api_keys").update({ last_used_at: stamp }).eq("id", id);
    return;
  }
  const key = memory.api_keys.find((k) => k.id === id);
  if (key) key.last_used_at = stamp;
}

export async function revokeApiKey(id: string): Promise<ApiKeyRecord | null> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("api_keys").update({ status: "revoked" }).eq("id", id).select("*").maybeSingle();
    return (data as ApiKeyRecord | null) ?? null;
  }
  const key = memory.api_keys.find((k) => k.id === id);
  if (!key) return null;
  key.status = "revoked";
  return clone(key);
}

export async function createConversationRecord(input: Omit<Conversation, "id" | "created_at" | "updated_at">): Promise<Conversation> {
  const conversation: Conversation = {
    id: generateId("cnv"),
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  };
  const client = await sb();
  if (client) {
    const { error } = await client.from("conversations").insert(conversation);
    if (error) throw error;
  } else {
    memory.conversations.push(conversation);
  }
  return conversation;
}

export async function listConversations(projectId?: string): Promise<Conversation[]> {
  const client = await sb();
  if (client) {
    let query = client.from("conversations").select("*").order("updated_at", { ascending: false });
    if (projectId) query = query.eq("project_id", projectId);
    const { data } = await query;
    return (data as Conversation[]) ?? [];
  }
  const rows = projectId ? memory.conversations.filter((c) => c.project_id === projectId) : memory.conversations;
  return clone(rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("conversations").select("*").eq("id", id).maybeSingle();
    return (data as Conversation | null) ?? null;
  }
  return memory.conversations.find((c) => c.id === id) ?? null;
}

export async function deleteConversationRecord(id: string): Promise<boolean> {
  const existing = await getConversation(id);
  if (!existing) return false;
  const client = await sb();
  if (client) {
    await client.from("messages").delete().eq("conversation_id", id);
    await client.from("conversations").delete().eq("id", id);
    return true;
  }
  memory.messages = memory.messages.filter((m) => m.conversation_id !== id);
  memory.conversations = memory.conversations.filter((c) => c.id !== id);
  return true;
}

export async function addMessage(input: Omit<Message, "id" | "created_at">): Promise<Message> {
  const message: Message = { id: generateId("msg"), created_at: nowIso(), ...input };
  const client = await sb();
  if (client) {
    const { error } = await client.from("messages").insert(message);
    if (error) throw error;
    await client.from("conversations").update({ updated_at: nowIso() }).eq("id", message.conversation_id);
  } else {
    memory.messages.push(message);
    const conv = memory.conversations.find((c) => c.id === message.conversation_id);
    if (conv) conv.updated_at = nowIso();
  }
  return message;
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const client = await sb();
  if (client) {
    const { data } = await client
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    return (data as Message[]) ?? [];
  }
  return clone(memory.messages.filter((m) => m.conversation_id === conversationId));
}

export async function logUsage(
  input: Omit<UsageLog, "id" | "created_at" | "provider" | "estimated_cost_usd"> & {
    provider?: string;
    estimated_cost_usd?: number;
  },
): Promise<void> {
  const row: UsageLog = {
    ...input,
    id: generateId("usg"),
    created_at: nowIso(),
    provider: input.provider ?? "",
    estimated_cost_usd: input.estimated_cost_usd ?? 0,
  };
  const client = await sb();
  if (client) {
    await client.from("usage_logs").insert(row);
    return;
  }
  memory.usage_logs.push(row);
}

export async function listUsage(projectId?: string, limit = 200): Promise<UsageLog[]> {
  const client = await sb();
  if (client) {
    let query = client.from("usage_logs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (projectId) query = query.eq("project_id", projectId);
    const { data } = await query;
    return (data as UsageLog[]) ?? [];
  }
  const rows = projectId ? memory.usage_logs.filter((u) => u.project_id === projectId) : memory.usage_logs;
  return clone(rows.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit)).map((row) => ({
    ...row,
    provider: row.provider ?? "",
    estimated_cost_usd: row.estimated_cost_usd ?? 0,
  }));
}

export async function writeAudit(input: Omit<AuditLog, "id" | "created_at">): Promise<void> {
  const row: AuditLog = { id: generateId("aud"), created_at: nowIso(), ...input };
  const client = await sb();
  if (client) {
    await client.from("audit_logs").insert(row);
    return;
  }
  memory.audit_logs.push(row);
}

export async function listAudit(limit = 100): Promise<AuditLog[]> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
    return (data as AuditLog[]) ?? [];
  }
  return clone(memory.audit_logs.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit));
}

export function publicCredential(row: ProviderCredential) {
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    key_prefix: row.key_prefix,
    status: row.status,
    last_validated_at: row.last_validated_at,
    last_error: row.last_error,
    priority: row.priority,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listProviderCredentials(provider?: ProviderId): Promise<ProviderCredential[]> {
  const client = await sb();
  if (client) {
    let query = client.from("provider_credentials").select("*").order("priority", { ascending: true });
    if (provider) query = query.eq("provider", provider);
    const { data } = await query;
    return (data as ProviderCredential[]) ?? [];
  }
  const rows = provider
    ? memory.provider_credentials.filter((c) => c.provider === provider)
    : memory.provider_credentials;
  return clone(rows.sort((a, b) => a.priority - b.priority));
}

export async function getProviderCredential(id: string): Promise<ProviderCredential | null> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("provider_credentials").select("*").eq("id", id).maybeSingle();
    return (data as ProviderCredential | null) ?? null;
  }
  return memory.provider_credentials.find((c) => c.id === id) ?? null;
}

export async function createProviderCredential(input: {
  provider: ProviderId;
  label: string;
  apiKey: string;
  priority?: number;
}): Promise<ProviderCredential> {
  const existing = await listProviderCredentials(input.provider);
  const row: ProviderCredential = {
    id: generateId("crd"),
    provider: input.provider,
    label: input.label,
    key_prefix: secretPrefix(input.apiKey),
    key_ciphertext: encryptSecret(input.apiKey),
    status: "active",
    last_validated_at: null,
    last_error: null,
    priority: input.priority ?? existing.length,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const client = await sb();
  if (client) {
    const { error } = await client.from("provider_credentials").insert(row);
    if (error) throw error;
  } else {
    memory.provider_credentials.push(row);
  }
  return row;
}

export async function updateProviderCredential(
  id: string,
  patch: Partial<Pick<ProviderCredential, "label" | "status" | "priority" | "last_validated_at" | "last_error">> & {
    apiKey?: string;
  },
): Promise<ProviderCredential | null> {
  const existing = await getProviderCredential(id);
  if (!existing) return null;
  const next: ProviderCredential = {
    ...existing,
    label: patch.label ?? existing.label,
    status: patch.status ?? existing.status,
    priority: patch.priority ?? existing.priority,
    last_validated_at: patch.last_validated_at === undefined ? existing.last_validated_at : patch.last_validated_at,
    last_error: patch.last_error === undefined ? existing.last_error : patch.last_error,
    updated_at: nowIso(),
  };
  if (patch.apiKey) {
    next.key_ciphertext = encryptSecret(patch.apiKey);
    next.key_prefix = secretPrefix(patch.apiKey);
    next.status = "active";
    next.last_error = null;
  }
  const client = await sb();
  if (client) {
    const { error } = await client.from("provider_credentials").update(next).eq("id", id);
    if (error) throw error;
    return next;
  }
  const idx = memory.provider_credentials.findIndex((c) => c.id === id);
  memory.provider_credentials[idx] = next;
  return next;
}

export async function deleteProviderCredential(id: string): Promise<boolean> {
  const existing = await getProviderCredential(id);
  if (!existing) return false;
  const client = await sb();
  if (client) {
    const { error } = await client.from("provider_credentials").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
  memory.provider_credentials = memory.provider_credentials.filter((c) => c.id !== id);
  return true;
}

export function decryptCredential(row: ProviderCredential): string {
  return decryptSecret(row.key_ciphertext);
}

export async function resolveProviderCredential(provider: ProviderId): Promise<{
  provider: ProviderId;
  apiKey: string;
  credentialId: string | null;
} | null> {
  const stored = (await listProviderCredentials(provider)).filter((c) => c.status === "active");
  for (const row of stored) {
    try {
      return { provider, apiKey: decryptCredential(row), credentialId: row.id };
    } catch {
      continue;
    }
  }
  const envKey = envKeyForProvider(provider);
  if (envKey) return { provider, apiKey: envKey, credentialId: null };
  return null;
}

export async function listRoutingPolicies(projectId?: string | null): Promise<RoutingPolicy[]> {
  const client = await sb();
  if (client) {
    let query = client.from("routing_policies").select("*").order("updated_at", { ascending: false });
    if (projectId === null) query = query.is("project_id", null);
    else if (projectId) query = query.eq("project_id", projectId);
    const { data } = await query;
    return (data as RoutingPolicy[]) ?? [];
  }
  let rows = memory.routing_policies;
  if (projectId === null) rows = rows.filter((r) => r.project_id === null);
  else if (projectId) rows = rows.filter((r) => r.project_id === projectId);
  return clone(rows);
}

export async function getRoutingPolicy(id: string): Promise<RoutingPolicy | null> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("routing_policies").select("*").eq("id", id).maybeSingle();
    return (data as RoutingPolicy | null) ?? null;
  }
  return memory.routing_policies.find((r) => r.id === id) ?? null;
}

export async function createRoutingPolicy(
  input: Omit<RoutingPolicy, "id" | "created_at" | "updated_at">,
): Promise<RoutingPolicy> {
  const row: RoutingPolicy = {
    id: generateId("rte"),
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  };
  const client = await sb();
  if (client) {
    const { error } = await client.from("routing_policies").insert(row);
    if (error) throw error;
  } else {
    memory.routing_policies.push(row);
  }
  return row;
}

export async function updateRoutingPolicy(id: string, patch: Partial<RoutingPolicy>): Promise<RoutingPolicy | null> {
  const existing = await getRoutingPolicy(id);
  if (!existing) return null;
  const next = { ...existing, ...patch, updated_at: nowIso() };
  const client = await sb();
  if (client) {
    const { error } = await client.from("routing_policies").update(next).eq("id", id);
    if (error) throw error;
    return next;
  }
  const idx = memory.routing_policies.findIndex((r) => r.id === id);
  memory.routing_policies[idx] = next;
  return next;
}

export async function deleteRoutingPolicy(id: string): Promise<boolean> {
  const existing = await getRoutingPolicy(id);
  if (!existing) return false;
  const client = await sb();
  if (client) {
    const { error } = await client.from("routing_policies").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
  memory.routing_policies = memory.routing_policies.filter((r) => r.id !== id);
  return true;
}

export async function logFailover(input: Omit<FailoverLog, "id" | "created_at">): Promise<void> {
  const row: FailoverLog = { id: generateId("fail"), created_at: nowIso(), ...input };
  const client = await sb();
  if (client) {
    await client.from("failover_logs").insert(row);
    return;
  }
  memory.failover_logs.push(row);
}

export async function recordFailoverAttempt(
  attempt: FailoverAttempt & { projectId?: string; agentId?: string },
): Promise<void> {
  await logFailover({
    project_id: attempt.projectId ?? null,
    agent_id: attempt.agentId ?? null,
    provider: attempt.provider,
    model: attempt.model,
    status: attempt.status,
    error_code: attempt.errorCode ?? null,
    error: attempt.error ?? null,
    latency_ms: attempt.latencyMs,
    retryable: Boolean(attempt.retryable),
  });
}

export async function listFailoverLogs(projectId?: string, limit = 100): Promise<FailoverLog[]> {
  const client = await sb();
  if (client) {
    let query = client.from("failover_logs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (projectId) query = query.eq("project_id", projectId);
    const { data } = await query;
    return (data as FailoverLog[]) ?? [];
  }
  const rows = projectId ? memory.failover_logs.filter((f) => f.project_id === projectId) : memory.failover_logs;
  return clone(rows.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit));
}

export async function listMemories(projectId: string, agentId?: string | null): Promise<MemoryRecord[]> {
  const client = await sb();
  if (client) {
    let query = client.from("memories").select("*").eq("project_id", projectId).order("updated_at", { ascending: false });
    if (agentId) query = query.eq("agent_id", agentId);
    const { data } = await query;
    return (data as MemoryRecord[]) ?? [];
  }
  return clone(
    memory.memories
      .filter((m) => m.project_id === projectId && (agentId ? m.agent_id === agentId : true))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
  );
}

export async function getMemory(id: string): Promise<MemoryRecord | null> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("memories").select("*").eq("id", id).maybeSingle();
    return (data as MemoryRecord | null) ?? null;
  }
  return memory.memories.find((m) => m.id === id) ?? null;
}

export async function upsertMemory(input: {
  project_id: string;
  agent_id?: string | null;
  key: string;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<MemoryRecord> {
  const existingList = await listMemories(input.project_id, input.agent_id ?? null);
  const existing = existingList.find((m) => m.key === input.key && (m.agent_id ?? null) === (input.agent_id ?? null));
  if (existing) {
    const next: MemoryRecord = {
      ...existing,
      content: input.content,
      metadata: input.metadata ?? existing.metadata,
      updated_at: nowIso(),
    };
    const client = await sb();
    if (client) {
      const { error } = await client.from("memories").update(next).eq("id", existing.id);
      if (error) throw error;
    } else {
      const idx = memory.memories.findIndex((m) => m.id === existing.id);
      memory.memories[idx] = next;
    }
    return next;
  }
  const row: MemoryRecord = {
    id: generateId("mem"),
    project_id: input.project_id,
    agent_id: input.agent_id ?? null,
    key: input.key,
    content: input.content,
    metadata: input.metadata ?? {},
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const client = await sb();
  if (client) {
    const { error } = await client.from("memories").insert(row);
    if (error) throw error;
  } else {
    memory.memories.push(row);
  }
  return row;
}

export async function deleteMemory(id: string): Promise<boolean> {
  const existing = await getMemory(id);
  if (!existing) return false;
  const client = await sb();
  if (client) {
    const { error } = await client.from("memories").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
  memory.memories = memory.memories.filter((m) => m.id !== id);
  return true;
}

export async function retrieveMemories(projectId: string, agentId: string | null, query: string, limit = 8): Promise<MemoryRecord[]> {
  const rows = await listMemories(projectId, undefined);
  const scoped = rows.filter((m) => !m.agent_id || m.agent_id === agentId);
  const q = query.toLowerCase();
  const scored = scoped
    .map((row) => {
      const hay = `${row.key} ${row.content}`.toLowerCase();
      const score = q.split(/\s+/).filter(Boolean).reduce((acc, word) => acc + (hay.includes(word) ? 1 : 0), 0);
      return { row, score };
    })
    .filter((item) => item.score > 0 || q.length === 0)
    .sort((a, b) => b.score - a.score || b.row.updated_at.localeCompare(a.row.updated_at));
  return scored.slice(0, limit).map((s) => s.row);
}

export function __resetMemoryStore() {
  seeded = false;
  (Object.keys(memory) as (keyof Tables)[]).forEach((key) => {
    memory[key] = [];
  });
}
