-- Per-member access to the shared (client-less) Product hunting table.
--
--  * workspace_members.shared_table_access  -> can this member open the table
--  * workspace_invitations.shared_table     -> what the invite will grant
--  * can_view_shared_table / can_write_shared_table -> RLS helpers
--  * set_shared_table_access                -> owner toggle from Team & access
--
-- The owner always has access. Existing members default to true so nothing
-- disappears the moment this runs; you can then turn it off per person.

alter table public.workspace_members
  add column if not exists shared_table_access boolean not null default true;

alter table public.workspace_invitations
  add column if not exists shared_table boolean not null default true;

-- ---------------------------------------------------------------- helpers ---
create or replace function public.can_view_shared_table(wid text) returns boolean
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (
    select 1 from public.workspaces w where w.id = wid and w.owner_id = auth.uid()
  ) or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = wid and m.user_id = auth.uid() and m.shared_table_access
  )
$$;

create or replace function public.can_write_shared_table(wid text) returns boolean
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select public.can_view_shared_table(wid)
    and public.workspace_role(wid) in ('owner','manager','va')
$$;

revoke all on function public.can_view_shared_table(text), public.can_write_shared_table(text) from public;
grant execute on function public.can_view_shared_table(text), public.can_write_shared_table(text) to authenticated;

-- --------------------------------------------------------------- policies ---
drop policy if exists "Workspace rows read" on public.workspace_rows;
drop policy if exists "Workspace rows insert" on public.workspace_rows;
drop policy if exists "Workspace rows update" on public.workspace_rows;

create policy "Workspace rows read" on public.workspace_rows
  for select to authenticated
  using (deleted_at is null and client_id is null and public.can_view_shared_table(workspace_id));

create policy "Workspace rows insert" on public.workspace_rows
  for insert to authenticated
  with check (client_id is null and workspace_id is not null and public.can_write_shared_table(workspace_id));

create policy "Workspace rows update" on public.workspace_rows
  for update to authenticated
  using (client_id is null and public.can_write_shared_table(workspace_id))
  with check (client_id is null and workspace_id is not null and public.can_write_shared_table(workspace_id));

-- ------------------------------------------------------------- invite RPCs ---
-- Signature changes: drop the old ones so PostgREST cannot see two overloads.
drop function if exists public.send_workspace_invitation(text, text, text, text[]);
drop function if exists public.list_workspace_members(text);
drop function if exists public.accept_workspace_invitation(uuid);
drop function if exists public.list_my_workspace_invitations();

create or replace function public.send_workspace_invitation(
  p_workspace_id text,
  p_recipient_public_id text,
  p_role text,
  p_client_ids text[] default '{}',
  p_shared_table boolean default true
) returns uuid
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare recipient_id uuid; recipient_code text; invitation_id uuid;
begin
  if auth.uid() is null or public.workspace_role(p_workspace_id) is distinct from 'owner' then
    raise exception 'not authorized';
  end if;
  if p_role not in ('manager', 'va', 'viewer') then raise exception 'invalid role'; end if;

  select p.user_id, p.public_id into recipient_id, recipient_code
  from public.user_profiles p
  where p.public_id = upper(trim(p_recipient_public_id));
  if recipient_id is null then raise exception 'Dropdesk ID not found'; end if;
  if recipient_id = auth.uid() then raise exception 'cannot invite yourself'; end if;
  if exists (select 1 from public.workspace_members m where m.workspace_id = p_workspace_id and m.user_id = recipient_id) then
    raise exception 'user is already a workspace member';
  end if;
  update public.workspace_invitations set declined_at = now()
  where workspace_id = p_workspace_id and recipient_user_id = recipient_id
    and accepted_at is null and declined_at is null and expires_at <= now();
  if exists (
    select 1 from public.workspace_invitations i
    where i.workspace_id = p_workspace_id and i.recipient_user_id = recipient_id
      and i.accepted_at is null and i.declined_at is null and i.expires_at > now()
  ) then raise exception 'a pending invitation already exists'; end if;
  if exists (
    select 1 from unnest(coalesce(p_client_ids, '{}')) as selected(client_id)
    left join public.clients c on c.id = selected.client_id
    where c.id is null or c.workspace_id <> p_workspace_id
  ) then raise exception 'invalid client selection'; end if;

  insert into public.workspace_invitations(
    workspace_id, recipient_user_id, role, invited_by, client_ids, shared_table, expires_at
  ) values (
    p_workspace_id, recipient_id, p_role, auth.uid(), coalesce(p_client_ids, '{}'),
    coalesce(p_shared_table, true), now() + interval '7 days'
  ) returning id into invitation_id;
  insert into public.audit_logs(workspace_id, actor_user_id, action, resource_type, resource_id, metadata)
  values (p_workspace_id, auth.uid(), 'invited', 'workspace_member', recipient_id::text,
    jsonb_build_object('recipient_public_id', recipient_code, 'role', p_role, 'shared_table', coalesce(p_shared_table, true)));
  return invitation_id;
end $$;

create or replace function public.accept_workspace_invitation(p_invitation_id uuid)
returns text
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare inv public.workspace_invitations%rowtype;
begin
  if auth.uid() is null then raise exception 'not authorized'; end if;
  select * into inv from public.workspace_invitations
  where id = p_invitation_id and recipient_user_id = auth.uid()
  for update;
  if not found or inv.accepted_at is not null or inv.declined_at is not null or inv.expires_at <= now() then
    raise exception 'invitation is unavailable or expired';
  end if;
  if exists (select 1 from public.workspace_members where workspace_id = inv.workspace_id and user_id = auth.uid()) then
    raise exception 'already a workspace member';
  end if;

  insert into public.workspace_members(workspace_id, user_id, role, shared_table_access)
  values (inv.workspace_id, auth.uid(), inv.role, coalesce(inv.shared_table, true));
  insert into public.client_access(client_id, user_id, granted_by)
  select c.id, auth.uid(), inv.invited_by
  from public.clients c
  where c.workspace_id = inv.workspace_id and c.id = any(inv.client_ids)
  on conflict (client_id, user_id) do nothing;
  update public.workspace_invitations set accepted_at = now() where id = inv.id;
  insert into public.audit_logs(workspace_id, actor_user_id, action, resource_type, resource_id, metadata)
  values (inv.workspace_id, auth.uid(), 'accepted_invitation', 'workspace_member', auth.uid()::text,
    jsonb_build_object('role', inv.role, 'shared_table', coalesce(inv.shared_table, true)));
  return inv.workspace_id;
end $$;

create or replace function public.list_workspace_members(p_workspace_id text)
returns table(user_id uuid, email text, role text, client_ids text[], shared_table_access boolean, joined_at timestamptz)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null or public.workspace_role(p_workspace_id) is distinct from 'owner' then
    raise exception 'not authorized';
  end if;

  return query
  select m.user_id,
         coalesce(u.email, '')::text,
         m.role,
         coalesce(access.client_ids, '{}'::text[]),
         m.shared_table_access,
         m.created_at
  from public.workspace_members m
  left join auth.users u on u.id = m.user_id
  left join lateral (
    select array_agg(a.client_id order by a.client_id) as client_ids
    from public.client_access a
    join public.clients c on c.id = a.client_id
    where a.user_id = m.user_id and c.workspace_id = p_workspace_id
  ) access on true
  where m.workspace_id = p_workspace_id
  order by m.created_at;
end $$;

create or replace function public.list_my_workspace_invitations()
returns table(
  id uuid, workspace_id text, workspace_name text, inviter_name text,
  role text, client_ids text[], shared_table boolean, created_at timestamptz, expires_at timestamptz
)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not authorized'; end if;
  return query
    select i.id, i.workspace_id, w.name,
      coalesce(p.display_name, 'Workspace owner'), i.role, i.client_ids,
      coalesce(i.shared_table, true), i.created_at, i.expires_at
    from public.workspace_invitations i
    join public.workspaces w on w.id = i.workspace_id
    left join public.user_profiles p on p.user_id = i.invited_by
    where i.recipient_user_id = auth.uid() and i.accepted_at is null
      and i.declined_at is null and i.expires_at > now()
    order by i.created_at desc;
end $$;

create or replace function public.set_shared_table_access(
  p_workspace_id text, p_user_id uuid, p_enabled boolean
) returns void
language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null or public.workspace_role(p_workspace_id) is distinct from 'owner' then
    raise exception 'not authorized';
  end if;
  update public.workspace_members
  set shared_table_access = p_enabled, updated_at = now()
  where workspace_id = p_workspace_id and user_id = p_user_id;
  if not found then raise exception 'workspace member not found'; end if;
  insert into public.audit_logs(workspace_id, actor_user_id, action, resource_type, resource_id, metadata)
  values (p_workspace_id, auth.uid(), 'shared_table_access_changed', 'workspace_member', p_user_id::text,
    jsonb_build_object('enabled', p_enabled));
end $$;

revoke all on function public.send_workspace_invitation(text, text, text, text[], boolean) from public;
revoke all on function public.accept_workspace_invitation(uuid) from public;
revoke all on function public.list_workspace_members(text) from public;
revoke all on function public.list_my_workspace_invitations() from public;
revoke all on function public.set_shared_table_access(text, uuid, boolean) from public;
grant execute on function public.send_workspace_invitation(text, text, text, text[], boolean),
  public.accept_workspace_invitation(uuid),
  public.list_workspace_members(text),
  public.list_my_workspace_invitations(),
  public.set_shared_table_access(text, uuid, boolean) to authenticated;

-- ----------------------------------------------------------- verification ---
select 'shared_table_access column' as check_name,
       (count(*) > 0)::text as ok
from information_schema.columns
where table_schema = 'public' and table_name = 'workspace_members' and column_name = 'shared_table_access'
union all
select 'set_shared_table_access function', (count(*) > 0)::text
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'set_shared_table_access'
union all
select 'shared table policies', count(*)::text
from pg_policies where schemaname = 'public' and tablename = 'workspace_rows' and policyname like 'Workspace rows %';
