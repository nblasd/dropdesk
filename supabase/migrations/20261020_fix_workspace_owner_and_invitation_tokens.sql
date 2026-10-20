-- Repair owner access for existing accounts and remove the invitation RPC's
-- dependency on pgcrypto functions being present in the function search_path.

-- Every account gets a workspace, including accounts created before the
-- workspace bootstrap trigger and accounts that had no clients yet.
insert into public.workspaces(name, owner_id)
select coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)) || '''s Workspace', u.id
from auth.users u
where not exists (select 1 from public.workspaces w where w.owner_id = u.id);

-- workspaces.owner_id is authoritative; restore a missing or stale owner row.
insert into public.workspace_members(workspace_id, user_id, role)
select w.id, w.owner_id, 'owner'
from public.workspaces w
on conflict (workspace_id, user_id) do update
set role = 'owner', updated_at = now();

update public.clients c
set workspace_id = w.id,
    created_by = coalesce(c.created_by, c.user_id),
    updated_by = coalesce(c.updated_by, c.user_id)
from public.workspaces w
where c.user_id = w.owner_id and c.workspace_id is null;

create or replace function public.is_workspace_member(wid text) returns boolean
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = wid and w.owner_id = auth.uid()
  ) or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = wid and m.user_id = auth.uid()
  )
$$;

create or replace function public.workspace_role(wid text) returns text
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select case when w.owner_id = auth.uid() then 'owner' else m.role end
  from public.workspaces w
  left join public.workspace_members m
    on m.workspace_id = w.id and m.user_id = auth.uid()
  where w.id = wid and (w.owner_id = auth.uid() or m.user_id is not null)
  limit 1
$$;

create or replace function public.can_access_client(cid text) returns boolean
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (
    select 1
    from public.clients c
    join public.workspaces w on w.id = c.workspace_id
    left join public.workspace_members m
      on m.workspace_id = c.workspace_id and m.user_id = auth.uid()
    where c.id = cid and c.archived_at is null
      and (
        w.owner_id = auth.uid()
        or (m.user_id is not null and (
          m.role = 'owner'
          or c.visibility = 'workspace'
          or exists (
            select 1 from public.client_access a
            where a.client_id = c.id and a.user_id = auth.uid()
          )
        ))
      )
  )
$$;

create or replace function public.can_write_client(cid text) returns boolean
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select public.can_access_client(cid)
    and public.workspace_role((select c.workspace_id from public.clients c where c.id = cid))
      in ('owner', 'manager', 'va')
$$;

revoke all on function public.is_workspace_member(text), public.workspace_role(text),
  public.can_access_client(text), public.can_write_client(text) from public;
grant execute on function public.is_workspace_member(text), public.workspace_role(text),
  public.can_access_client(text), public.can_write_client(text) to authenticated;

-- Generate a 244-bit token from two core UUIDs and hash it with PostgreSQL's
-- built-in SHA-256 function. This works regardless of the pgcrypto schema.
create or replace function public.create_workspace_invitation(
  p_workspace_id text, p_email text, p_role text, p_client_ids text[] default '{}'
) returns text
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  raw_token text;
  normalized_email text;
begin
  if auth.uid() is null or public.workspace_role(p_workspace_id) <> 'owner' then
    raise exception 'not authorized';
  end if;
  if p_role not in ('manager', 'va', 'viewer') then raise exception 'invalid role'; end if;
  normalized_email := lower(trim(p_email));
  if normalized_email = '' or position('@' in normalized_email) = 0 then raise exception 'invalid email'; end if;
  if exists (
    select 1 from unnest(coalesce(p_client_ids, '{}')) as selected(client_id)
    left join public.clients c on c.id = selected.client_id
    where c.id is null or c.workspace_id <> p_workspace_id
  ) then raise exception 'invalid client selection'; end if;

  raw_token := replace(pg_catalog.gen_random_uuid()::text, '-', '')
    || replace(pg_catalog.gen_random_uuid()::text, '-', '');
  insert into public.workspace_invitations(
    workspace_id, email, role, invited_by, token_hash, client_ids, expires_at
  ) values (
    p_workspace_id, normalized_email, p_role, auth.uid(),
    encode(pg_catalog.sha256(convert_to(raw_token, 'UTF8')), 'hex'),
    coalesce(p_client_ids, '{}'), now() + interval '7 days'
  );
  insert into public.audit_logs(workspace_id, actor_user_id, action, resource_type, metadata)
  values (p_workspace_id, auth.uid(), 'invited', 'workspace_member',
    jsonb_build_object('email', normalized_email, 'role', p_role));
  return raw_token;
end
$$;

create or replace function public.accept_workspace_invitation(p_token text)
returns text
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  inv public.workspace_invitations%rowtype;
  caller_email text;
begin
  if auth.uid() is null then raise exception 'not authorized'; end if;
  caller_email := lower(coalesce(auth.jwt()->>'email', ''));
  select * into inv
  from public.workspace_invitations
  where token_hash = encode(pg_catalog.sha256(convert_to(p_token, 'UTF8')), 'hex')
  for update;
  if not found or inv.accepted_at is not null or inv.expires_at <= now()
    or inv.email <> caller_email then
    raise exception 'invitation invalid or expired';
  end if;
  if exists (
    select 1 from public.workspace_members
    where workspace_id = inv.workspace_id and user_id = auth.uid()
  ) then raise exception 'already a workspace member'; end if;

  insert into public.workspace_members(workspace_id, user_id, role)
  values (inv.workspace_id, auth.uid(), inv.role)
  on conflict (workspace_id, user_id) do update
  set role = excluded.role, updated_at = now();
  insert into public.client_access(client_id, user_id, granted_by)
  select c.id, auth.uid(), inv.invited_by
  from public.clients c
  where c.workspace_id = inv.workspace_id and c.id = any(inv.client_ids)
  on conflict (client_id, user_id) do nothing;
  update public.workspace_invitations set accepted_at = now() where id = inv.id;
  insert into public.audit_logs(workspace_id, actor_user_id, action, resource_type, resource_id, metadata)
  values (inv.workspace_id, auth.uid(), 'accepted_invitation', 'workspace_member', auth.uid()::text,
    jsonb_build_object('role', inv.role));
  return inv.workspace_id;
end
$$;

revoke all on function public.create_workspace_invitation(text, text, text, text[]) from public;
revoke all on function public.accept_workspace_invitation(text) from public;
grant execute on function public.create_workspace_invitation(text, text, text, text[]),
  public.accept_workspace_invitation(text) to authenticated;
