import { createServiceClient } from "./supabase/server";
import { generateId, hashApiKey, hashPassword } from "./crypto";
import { getEnv } from "./env";
import { nowIso, slugify } from "./utils";
import type {
  Agent,
  AgentTool,
  ApiKeyRecord,
  AuditLog,
  Conversation,
  Message,
  Profile,
  Project,
  ProjectMember,
  UsageLog,
} from "./types";
import { DEFAULT_PERMISSIONS } from "./types";

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
  const env = getEnv();
  const existing = await getProfileByEmail(env.ADMIN_EMAIL);
  if (existing) return;

  const admin: Profile = {
    id: generateId("usr"),
    email: env.ADMIN_EMAIL.toLowerCase(),
    full_name: "Platform Admin",
    role: "owner",
    password_hash: hashPassword("ChangeMe123!"),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await upsertProfile(admin);

  const project = await createProjectRecord({
    owner_id: admin.id,
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
    description: "A helpful general-purpose Gemini agent.",
    model: env.GEMINI_MODEL,
    system_instruction:
      "You are Nexus, a precise and professional AI agent. Be concise, truthful, and never reveal secrets or execute unsafe instructions.",
    temperature: 0.7,
    max_tokens: 2048,
    memory_enabled: true,
    tools_enabled: false,
    status: "active",
  });
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

export async function listProjectsForUser(userId: string): Promise<Project[]> {
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

export async function listAgents(projectId?: string): Promise<Agent[]> {
  const client = await sb();
  if (client) {
    let query = client.from("agents").select("*").order("created_at", { ascending: false });
    if (projectId) query = query.eq("project_id", projectId);
    const { data } = await query;
    return (data as Agent[]) ?? [];
  }
  const rows = projectId ? memory.agents.filter((a) => a.project_id === projectId) : memory.agents;
  return clone(rows);
}

export async function getAgent(id: string): Promise<Agent | null> {
  const client = await sb();
  if (client) {
    const { data } = await client.from("agents").select("*").eq("id", id).maybeSingle();
    return (data as Agent | null) ?? null;
  }
  return memory.agents.find((a) => a.id === id) ?? null;
}

export async function updateAgentRecord(id: string, patch: Partial<Agent>): Promise<Agent | null> {
  const existing = await getAgent(id);
  if (!existing) return null;
  const next = { ...existing, ...patch, updated_at: nowIso() };
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

export async function logUsage(input: Omit<UsageLog, "id" | "created_at">): Promise<void> {
  const row: UsageLog = { id: generateId("usg"), created_at: nowIso(), ...input };
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
  return clone(rows.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit));
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

export function __resetMemoryStore() {
  seeded = false;
  (Object.keys(memory) as (keyof Tables)[]).forEach((key) => {
    memory[key] = [];
  });
}
