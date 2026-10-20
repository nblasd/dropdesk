-- Fix NULL-unsafe owner checks in the workspace RPCs.
--
-- BUG: every guard used `public.workspace_role(p_workspace_id) <> 'owner'`.
-- For a caller with no membership, workspace_role() returns NULL, and
-- `NULL <> 'owner'` is NULL -- so `if NULL then raise` never fired. Any
-- authenticated user who knew a workspace id could therefore:
--   * list that workspace's member emails           (list_workspace_members)
--   * mint an invitation into it                    (create_workspace_invitation)
--   * invite an arbitrary Dropdesk ID as manager    (send_workspace_invitation)
--   * remove its members                            (revoke_workspace_member)
--
-- Fix: compare with `is distinct from 'owner'`, which is true for NULL.
create or replace function public.create_workspace_invitation(
  p_workspace_id text, p_email text, p_role text, p_client_ids text[] default '{}'
) returns text
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  raw_token text;
  normalized_email text;
begin
  if auth.uid() is null or public.workspace_role(p_workspace_id) is distinct from 'owner' then
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

create or replace function public.list_workspace_members(p_workspace_id text)
returns table(user_id uuid, email text, role text, client_ids text[], joined_at timestamptz)
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

create or replace function public.revoke_workspace_member(p_workspace_id text, p_user_id uuid)
returns void language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare owner_user_id uuid;
begin
  if auth.uid() is null or public.workspace_role(p_workspace_id) is distinct from 'owner' then
    raise exception 'not authorized';
  end if;
  select w.owner_id into owner_user_id from public.workspaces w where w.id = p_workspace_id;
  if p_user_id = owner_user_id then raise exception 'cannot revoke the workspace owner'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot remove your own workspace access'; end if;

  delete from public.client_access a
  using public.clients c
  where a.client_id = c.id and c.workspace_id = p_workspace_id and a.user_id = p_user_id;
  delete from public.workspace_members m where m.workspace_id = p_workspace_id and m.user_id = p_user_id;
  if not found then raise exception 'workspace member not found'; end if;

  insert into public.audit_logs(workspace_id, actor_user_id, action, resource_type, resource_id)
  values (p_workspace_id, auth.uid(), 'revoked', 'workspace_member', p_user_id::text);
end $$;

create or replace function public.send_workspace_invitation(
  p_workspace_id text,
  p_recipient_public_id text,
  p_role text,
  p_client_ids text[] default '{}'
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
    workspace_id, recipient_user_id, role, invited_by, client_ids, expires_at
  ) values (
    p_workspace_id, recipient_id, p_role, auth.uid(), coalesce(p_client_ids, '{}'), now() + interval '7 days'
  ) returning id into invitation_id;
  insert into public.audit_logs(workspace_id, actor_user_id, action, resource_type, resource_id, metadata)
  values (p_workspace_id, auth.uid(), 'invited', 'workspace_member', recipient_id::text,
    jsonb_build_object('recipient_public_id', recipient_code, 'role', p_role));
  return invitation_id;
end $$;
revoke all on function public.create_workspace_invitation(text, text, text, text[]) from public;
revoke all on function public.list_workspace_members(text) from public;
revoke all on function public.revoke_workspace_member(text, uuid) from public;
revoke all on function public.send_workspace_invitation(text, text, text, text[]) from public;
grant execute on function public.create_workspace_invitation(text, text, text, text[]),
  public.list_workspace_members(text),
  public.revoke_workspace_member(text, uuid),
  public.send_workspace_invitation(text, text, text, text[]) to authenticated;

-- Verification: all four rows should report the hardened guard.
select p.proname,
       position('is distinct from' in pg_get_functiondef(p.oid)) > 0 as hardened
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_workspace_invitation','list_workspace_members',
                    'revoke_workspace_member','send_workspace_invitation')
order by 1;