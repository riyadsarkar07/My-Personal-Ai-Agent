-- Multi-provider gateway, failover, credentials, and project memory.

alter table public.agents
  add column if not exists fallback_models text[] not null default '{}';

alter table public.usage_logs
  add column if not exists provider text not null default '';

alter table public.usage_logs
  add column if not exists estimated_cost_usd double precision not null default 0;

create table if not exists public.provider_credentials (
  id text primary key,
  provider text not null check (provider in ('gemini', 'openai', 'anthropic', 'groq', 'openrouter')),
  label text not null,
  key_prefix text not null,
  key_ciphertext text not null,
  status text not null default 'active' check (status in ('active', 'disabled', 'invalid')),
  last_validated_at timestamptz,
  last_error text,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routing_policies (
  id text primary key,
  project_id text references public.projects(id) on delete cascade,
  name text not null,
  primary_model text not null,
  fallback_models text[] not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.failover_logs (
  id text primary key,
  project_id text references public.projects(id) on delete set null,
  agent_id text references public.agents(id) on delete set null,
  provider text not null,
  model text not null,
  status text not null check (status in ('success', 'error', 'skipped')),
  error_code text,
  error text,
  latency_ms integer not null default 0,
  retryable boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.memories (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  agent_id text references public.agents(id) on delete cascade,
  key text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, agent_id, key)
);

create index if not exists idx_credentials_provider on public.provider_credentials (provider, priority);
create index if not exists idx_routing_project on public.routing_policies (project_id);
create index if not exists idx_failover_created on public.failover_logs (created_at desc);
create index if not exists idx_memories_project on public.memories (project_id, updated_at desc);

alter table public.provider_credentials enable row level security;
alter table public.routing_policies enable row level security;
alter table public.failover_logs enable row level security;
alter table public.memories enable row level security;

revoke all on public.provider_credentials from anon, authenticated;
revoke all on public.failover_logs from anon, authenticated;

create policy "routing_member_read" on public.routing_policies
  for select using (
    project_id is null or exists (
      select 1 from public.project_members m
      where m.project_id = routing_policies.project_id and m.user_id = auth.uid()::text
    )
  );

create policy "memories_member_read" on public.memories
  for select using (
    exists (
      select 1 from public.project_members m
      where m.project_id = memories.project_id and m.user_id = auth.uid()::text
    )
  );

grant select, insert, update, delete on public.provider_credentials to service_role;
grant select, insert, update, delete on public.routing_policies to service_role;
grant select, insert, update, delete on public.failover_logs to service_role;
grant select, insert, update, delete on public.memories to service_role;
