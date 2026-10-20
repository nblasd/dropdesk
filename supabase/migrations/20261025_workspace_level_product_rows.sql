-- Workspace-level table rows.
--
-- Up to now every workspace_rows row belonged to a client. The shared
-- "Product hunting" table is not tied to a client, so a row may now instead
-- point at a workspace:
--   client_id not null, workspace_id null   -> per-client row (unchanged)
--   client_id null,     workspace_id not null -> shared workspace row
--
-- Safe to re-run: every statement is guarded.

alter table public.workspace_rows alter column client_id drop not null;
alter table public.workspace_rows
  add column if not exists workspace_id text references public.workspaces(id) on delete cascade;

create index if not exists workspace_rows_workspace_idx
  on public.workspace_rows(workspace_id) where deleted_at is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'workspace_rows_scope_check') then
    alter table public.workspace_rows
      add constraint workspace_rows_scope_check
      check ((client_id is not null and workspace_id is null)
          or (client_id is null and workspace_id is not null));
  end if;
end $$;

drop policy if exists "Workspace rows read" on public.workspace_rows;
drop policy if exists "Workspace rows insert" on public.workspace_rows;
drop policy if exists "Workspace rows update" on public.workspace_rows;

-- Any workspace member can read the shared table.
create policy "Workspace rows read" on public.workspace_rows
  for select to authenticated
  using (deleted_at is null and client_id is null and public.is_workspace_member(workspace_id));

-- owner / manager / va can write; viewers stay read-only.
create policy "Workspace rows insert" on public.workspace_rows
  for insert to authenticated
  with check (
    client_id is null and workspace_id is not null
    and public.workspace_role(workspace_id) in ('owner','manager','va')
  );

create policy "Workspace rows update" on public.workspace_rows
  for update to authenticated
  using (
    client_id is null
    and public.workspace_role(workspace_id) in ('owner','manager','va')
  )
  with check (
    client_id is null and workspace_id is not null
    and public.workspace_role(workspace_id) in ('owner','manager','va')
  );

-- Verification
select 'client_id nullable' as check_name, (is_nullable = 'YES')::text as ok
from information_schema.columns
where table_schema = 'public' and table_name = 'workspace_rows' and column_name = 'client_id'
union all
select 'workspace_id column exists', (count(*) > 0)::text
from information_schema.columns
where table_schema = 'public' and table_name = 'workspace_rows' and column_name = 'workspace_id'
union all
select 'workspace policies', count(*)::text
from pg_policies
where schemaname = 'public' and tablename = 'workspace_rows' and policyname like 'Workspace rows %';
