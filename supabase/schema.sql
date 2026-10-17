-- Dropdesk starter schema. Run this in Supabase SQL Editor before connecting the app.
create table if not exists public.clients (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  initials text not null default '',
  color text not null default '#dfece4',
  store text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_rows (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  sheet text not null check (sheet in ('Product hunting', 'Listings', 'Orders')),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_tables (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  name text not null,
  columns jsonb not null default '[]'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists workspace_rows_user_client_sheet_idx on public.workspace_rows(user_id, client_id, sheet);
create index if not exists workspace_tables_user_client_idx on public.workspace_tables(user_id, client_id);
alter table public.clients enable row level security;
alter table public.workspace_rows enable row level security;
alter table public.workspace_tables enable row level security;

create policy "Users manage their own clients" on public.clients
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own workspace rows" on public.workspace_rows
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own workspace tables" on public.workspace_tables
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
