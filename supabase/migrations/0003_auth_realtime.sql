-- Auth profile alignment and Realtime publication. Additive only.

alter table public.profiles
  alter column password_hash drop not null;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'usage_logs'
  ) then
    alter publication supabase_realtime add table public.usage_logs;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'memories'
  ) then
    alter publication supabase_realtime add table public.memories;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'projects'
  ) then
    alter publication supabase_realtime add table public.projects;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'agents'
  ) then
    alter publication supabase_realtime add table public.agents;
  end if;
end $$;

alter table public.conversations replica identity full;
alter table public.messages replica identity full;
alter table public.usage_logs replica identity full;
alter table public.memories replica identity full;
alter table public.projects replica identity full;
alter table public.agents replica identity full;

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid()::text = id)
  with check (auth.uid()::text = id);

drop policy if exists "conversations_member_insert" on public.conversations;
create policy "conversations_member_insert" on public.conversations
  for insert with check (
    exists (
      select 1 from public.project_members m
      where m.project_id = conversations.project_id and m.user_id = auth.uid()::text
    )
  );

drop policy if exists "messages_member_insert" on public.messages;
create policy "messages_member_insert" on public.messages
  for insert with check (
    exists (
      select 1 from public.conversations c
      join public.project_members m on m.project_id = c.project_id
      where c.id = messages.conversation_id and m.user_id = auth.uid()::text
    )
  );
