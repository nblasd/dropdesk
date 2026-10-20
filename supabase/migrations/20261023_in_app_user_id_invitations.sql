-- Add Dropdesk ID invitations delivered inside the app. Keep the legacy email
-- link RPCs available during rollout so the currently deployed UI keeps working.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_id text not null unique default ('DD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))),
  display_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
drop policy if exists "Users can view their profile" on public.user_profiles;
create policy "Users can view their profile" on public.user_profiles
  for select to authenticated using (user_id = auth.uid());

insert into public.user_profiles(user_id, display_name)
select u.id, coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), nullif(u.raw_user_meta_data->>'name', ''), split_part(u.email, '@', 1), 'Dropdesk user')
from auth.users u
on conflict (user_id) do nothing;
revoke all on public.user_profiles from public, anon, authenticated;
grant select on public.user_profiles to authenticated;

alter table public.workspace_invitations
  alter column email drop not null,
  alter column token_hash drop not null,
  add column if not exists recipient_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists declined_at timestamptz;

create index if not exists workspace_invitations_recipient_pending_idx
  on public.workspace_invitations(recipient_user_id, created_at desc)
  where accepted_at is null and declined_at is null;

update public.workspace_invitations
set declined_at = now()
where recipient_user_id is not null and accepted_at is null and declined_at is null and expires_at <= now();
create unique index if not exists workspace_invitations_active_recipient_idx
  on public.workspace_invitations(workspace_id, recipient_user_id)
  where recipient_user_id is not null and accepted_at is null and declined_at is null;

create or replace function public.bootstrap_workspace_for_user() returns trigger
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare wid text; profile_name text;
begin
  profile_name := coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1), 'Dropdesk user');
  insert into public.user_profiles(user_id, display_name)
  values (new.id, profile_name)
  on conflict (user_id) do nothing;
  insert into public.workspaces(name, owner_id)
  values (profile_name || '''s Workspace', new.id)
  returning id into wid;
  insert into public.workspace_members(workspace_id, user_id, role)
  values (wid, new.id, 'owner');
  return new;
end $$;

create or replace function public.lookup_user_by_public_id(p_public_id text)
returns table(user_id uuid, public_id text, display_name text)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not authorized'; end if;
  return query
    select p.user_id, p.public_id, p.display_name
    from public.user_profiles p
    where p.public_id = upper(trim(p_public_id))
      and p.user_id <> auth.uid();
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
  if auth.uid() is null or public.workspace_role(p_workspace_id) <> 'owner' then
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

create or replace function public.list_my_workspace_invitations()
returns table(
  id uuid, workspace_id text, workspace_name text, inviter_name text,
  role text, client_ids text[], created_at timestamptz, expires_at timestamptz
)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not authorized'; end if;
  return query
    select i.id, i.workspace_id, w.name,
      coalesce(p.display_name, 'Workspace owner'), i.role, i.client_ids, i.created_at, i.expires_at
    from public.workspace_invitations i
    join public.workspaces w on w.id = i.workspace_id
    left join public.user_profiles p on p.user_id = i.invited_by
    where i.recipient_user_id = auth.uid() and i.accepted_at is null
      and i.declined_at is null and i.expires_at > now()
    order by i.created_at desc;
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

  insert into public.workspace_members(workspace_id, user_id, role)
  values (inv.workspace_id, auth.uid(), inv.role);
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
end $$;

create or replace function public.decline_workspace_invitation(p_invitation_id uuid)
returns void
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare invite_workspace_id text;
begin
  if auth.uid() is null then raise exception 'not authorized'; end if;
  update public.workspace_invitations
  set declined_at = now()
  where id = p_invitation_id and recipient_user_id = auth.uid()
    and accepted_at is null and declined_at is null and expires_at > now()
  returning workspace_id into invite_workspace_id;
  if not found then raise exception 'invitation is unavailable or expired'; end if;
  insert into public.audit_logs(workspace_id, actor_user_id, action, resource_type, resource_id)
  values (invite_workspace_id, auth.uid(), 'declined_invitation', 'workspace_member', auth.uid()::text);
end $$;

drop policy if exists "Invite owner manage" on public.workspace_invitations;
drop policy if exists "Invitation participants can view" on public.workspace_invitations;
create policy "Invitation participants can view" on public.workspace_invitations
  for select to authenticated
  using (public.workspace_role(workspace_id) = 'owner' or recipient_user_id = auth.uid());

revoke all on function public.lookup_user_by_public_id(text) from public;
revoke all on function public.send_workspace_invitation(text, text, text, text[]) from public;
revoke all on function public.list_my_workspace_invitations() from public;
revoke all on function public.accept_workspace_invitation(uuid) from public;
revoke all on function public.decline_workspace_invitation(uuid) from public;
grant execute on function public.lookup_user_by_public_id(text),
  public.send_workspace_invitation(text, text, text, text[]),
  public.list_my_workspace_invitations(),
  public.accept_workspace_invitation(uuid),
  public.decline_workspace_invitation(uuid) to authenticated;
