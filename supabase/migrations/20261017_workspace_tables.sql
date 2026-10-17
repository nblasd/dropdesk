create table if not exists public.workspace_tables (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  name text not null,
  columns jsonb not null default '[]'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists workspace_tables_user_client_idx on public.workspace_tables(user_id, client_id);
alter table public.workspace_tables enable row level security;

drop policy if exists "Users manage their own workspace tables" on public.workspace_tables;
create policy "Users manage their own workspace tables" on public.workspace_tables
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
