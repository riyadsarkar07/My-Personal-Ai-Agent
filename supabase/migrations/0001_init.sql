-- Nexus Agent Platform schema
-- Apply in the Supabase SQL editor or via supabase db push.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id text primary key,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  owner_id text not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text not null default '',
  rate_limit_rpm integer not null default 60,
  rate_limit_rpd integer not null default 10000,
  max_tokens_per_request integer not null default 4096,
  status text not null default 'active' check (status in ('active', 'archived')),
  allowed_origins text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  role text not null default 'developer' check (role in ('owner', 'admin', 'developer', 'viewer')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists public.agents (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  name text not null,
  description text not null default '',
  model text not null,
  system_instruction text not null default '',
  temperature double precision not null default 0.7,
  max_tokens integer not null default 2048,
  memory_enabled boolean not null default true,
  tools_enabled boolean not null default false,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_tools (
  id text primary key,
  agent_id text not null references public.agents(id) on delete cascade,
  name text not null,
  description text not null default '',
  parameters_schema jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  execution_mode text not null default 'sandbox' check (execution_mode in ('sandbox', 'deny')),
  created_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  permissions text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete cascade,
  title text not null default 'New conversation',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  token_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_logs (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  agent_id text references public.agents(id) on delete set null,
  api_key_id text references public.api_keys(id) on delete set null,
  conversation_id text references public.conversations(id) on delete set null,
  model text not null default '',
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  latency_ms integer not null default 0,
  status text not null default 'success',
  error text,
  path text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id text primary key,
  user_id text references public.profiles(id) on delete set null,
  project_id text references public.projects(id) on delete set null,
  action text not null,
  resource text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_owner on public.projects (owner_id);
create index if not exists idx_members_user on public.project_members (user_id);
create index if not exists idx_agents_project on public.agents (project_id);
create index if not exists idx_api_keys_project on public.api_keys (project_id);
create index if not exists idx_api_keys_hash on public.api_keys (key_hash);
create index if not exists idx_conversations_project on public.conversations (project_id);
create index if not exists idx_messages_conversation on public.messages (conversation_id, created_at);
create index if not exists idx_usage_project_created on public.usage_logs (project_id, created_at desc);
create index if not exists idx_audit_created on public.audit_logs (created_at desc);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.agents enable row level security;
alter table public.agent_tools enable row level security;
alter table public.api_keys enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.usage_logs enable row level security;
alter table public.audit_logs enable row level security;

-- Dashboard users authenticate through the Next.js session.
-- Anon clients cannot read API key hashes, service role bypasses RLS.

create policy "profiles_self_read" on public.profiles
  for select using (auth.uid()::text = id or email = auth.jwt() ->> 'email');

create policy "projects_member_read" on public.projects
  for select using (
    exists (
      select 1 from public.project_members m
      where m.project_id = projects.id and m.user_id = auth.uid()::text
    )
  );

create policy "members_self_read" on public.project_members
  for select using (user_id = auth.uid()::text);

create policy "agents_member_read" on public.agents
  for select using (
    exists (
      select 1 from public.project_members m
      where m.project_id = agents.project_id and m.user_id = auth.uid()::text
    )
  );

create policy "conversations_member_read" on public.conversations
  for select using (
    exists (
      select 1 from public.project_members m
      where m.project_id = conversations.project_id and m.user_id = auth.uid()::text
    )
  );

create policy "messages_member_read" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      join public.project_members m on m.project_id = c.project_id
      where c.id = messages.conversation_id and m.user_id = auth.uid()::text
    )
  );

create policy "usage_member_read" on public.usage_logs
  for select using (
    exists (
      select 1 from public.project_members m
      where m.project_id = usage_logs.project_id and m.user_id = auth.uid()::text
    )
  );

-- No anon select on api_keys or audit_logs. Service role only.
revoke all on public.api_keys from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
