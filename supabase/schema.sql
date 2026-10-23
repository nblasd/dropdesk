-- Dropdesk Supabase schema. Safe to run on fresh projects; existing records are preserved.
create extension if not exists pgcrypto;
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
  client_id text references public.clients(id) on delete cascade,
  workspace_id text references public.workspaces(id) on delete cascade,
  sheet text not null check (sheet in ('Product hunting','Listings','Orders')),
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
create index if not exists workspace_rows_user_client_sheet_idx on public.workspace_rows(user_id,client_id,sheet);
create index if not exists workspace_tables_user_client_idx on public.workspace_tables(user_id,client_id);
alter table public.clients enable row level security;
alter table public.workspace_rows enable row level security;
alter table public.workspace_tables enable row level security;
drop policy if exists "Users manage their own clients" on public.clients;
drop policy if exists "Users manage their own workspace rows" on public.workspace_rows;
drop policy if exists "Users manage their own workspace tables" on public.workspace_tables;
-- Secure multi-client access migration. Safe to apply after the original schema.
-- Existing clients and rows are retained and assigned to their current owner.
create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.workspace_members (
  id text primary key default gen_random_uuid()::text,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','va','viewer')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(workspace_id,user_id)
);
alter table public.clients add column if not exists workspace_id text references public.workspaces(id) on delete cascade;
alter table public.clients add column if not exists visibility text not null default 'selected' check (visibility in ('workspace','selected','private'));
alter table public.clients add column if not exists archived_at timestamptz;
alter table public.clients add column if not exists archived_by uuid references auth.users(id) on delete set null;
alter table public.clients add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.clients add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.workspace_rows add column if not exists deleted_at timestamptz;
alter table public.workspace_rows add column if not exists deleted_by uuid references auth.users(id) on delete set null;
alter table public.workspace_tables add column if not exists deleted_at timestamptz;
alter table public.workspace_tables add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create table if not exists public.client_access (
  id text primary key default gen_random_uuid()::text,
  client_id text not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), unique(client_id,user_id)
);
create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(), workspace_id text not null references public.workspaces(id) on delete cascade,
  email text not null, role text not null check (role in ('manager','va','viewer')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique, client_ids text[] not null default '{}',
  expires_at timestamptz not null, accepted_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), workspace_id text not null references public.workspaces(id) on delete cascade,
  client_id text references public.clients(id) on delete set null, actor_user_id uuid references auth.users(id) on delete set null,
  action text not null, resource_type text not null, resource_id text, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists clients_workspace_idx on public.clients(workspace_id) where archived_at is null;
create index if not exists workspace_members_user_idx on public.workspace_members(user_id,workspace_id);
create index if not exists client_access_user_idx on public.client_access(user_id,client_id);
create index if not exists workspace_rows_client_idx on public.workspace_rows(client_id,sheet) where deleted_at is null;
create index if not exists workspace_rows_workspace_idx on public.workspace_rows(workspace_id) where deleted_at is null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'workspace_rows_scope_check') then
    alter table public.workspace_rows add constraint workspace_rows_scope_check
      check ((client_id is not null and workspace_id is null) or (client_id is null and workspace_id is not null));
  end if;
end $$;
create index if not exists workspace_tables_client_idx on public.workspace_tables(client_id) where deleted_at is null;
create index if not exists audit_logs_workspace_created_idx on public.audit_logs(workspace_id,created_at desc);

-- Security definer predicates avoid recursive RLS policies on membership tables.
create or replace function public.is_workspace_member(wid text) returns boolean
language sql stable security definer set search_path=public,auth,pg_temp as $$
  select exists(select 1 from public.workspaces w where w.id=wid and w.owner_id=auth.uid())
    or exists(select 1 from public.workspace_members m where m.workspace_id=wid and m.user_id=auth.uid())
$$;
create or replace function public.workspace_role(wid text) returns text
language sql stable security definer set search_path=public,auth,pg_temp as $$
  select case when w.owner_id=auth.uid() then 'owner' else m.role end
  from public.workspaces w left join public.workspace_members m
    on m.workspace_id=w.id and m.user_id=auth.uid()
  where w.id=wid and (w.owner_id=auth.uid() or m.user_id is not null) limit 1
$$;
create or replace function public.can_access_client(cid text) returns boolean
language sql stable security definer set search_path=public,auth,pg_temp as $$
  select exists(select 1 from public.clients c join public.workspaces w on w.id=c.workspace_id
    left join public.workspace_members m on m.workspace_id=c.workspace_id and m.user_id=auth.uid()
    where c.id=cid and c.archived_at is null and (w.owner_id=auth.uid() or (m.user_id is not null and
      (m.role='owner' or c.visibility='workspace' or exists(select 1 from public.client_access a where a.client_id=c.id and a.user_id=auth.uid())))))
$$;
create or replace function public.can_write_client(cid text) returns boolean
language sql stable security definer set search_path=public,auth,pg_temp as $$
 select public.can_access_client(cid) and public.workspace_role((select c.workspace_id from public.clients c where c.id=cid)) in ('owner','manager','va')
$$;
revoke all on function public.is_workspace_member(text),public.workspace_role(text),public.can_access_client(text),public.can_write_client(text) from public;
grant execute on function public.is_workspace_member(text),public.workspace_role(text),public.can_access_client(text),public.can_write_client(text) to authenticated;

-- One initial workspace per existing account. Existing rows and IDs remain intact.
insert into public.workspaces(name,owner_id)
select coalesce(nullif(u.raw_user_meta_data->>'full_name',''),split_part(u.email,'@',1))||'''s Workspace',u.id
from auth.users u where not exists(select 1 from public.workspaces w where w.owner_id=u.id);
insert into public.workspace_members(workspace_id,user_id,role)
select w.id,w.owner_id,'owner' from public.workspaces w
on conflict(workspace_id,user_id) do update set role='owner',updated_at=now();
update public.clients c set workspace_id=m.workspace_id,created_by=coalesce(c.created_by,c.user_id),updated_by=coalesce(c.updated_by,c.user_id)
from public.workspace_members m where m.user_id=c.user_id and m.role='owner' and c.workspace_id is null;
-- Include existing accounts that did not yet have a client when workspace access was introduced.
insert into public.workspace_members(workspace_id,user_id,role)
select w.id,w.owner_id,'owner' from public.workspaces w
where not exists(select 1 from public.workspace_members m where m.workspace_id=w.id and m.user_id=w.owner_id)
on conflict(workspace_id,user_id) do update set role='owner',updated_at=now();
-- Existing owner-owned clients remain accessible to the owner only until explicitly shared.
update public.clients set visibility='selected' where visibility is null;

-- Bootstrap new signups with their own workspace. No user IDs or emails are privileged.
create or replace function public.bootstrap_workspace_for_user() returns trigger
language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare wid text;
begin
 insert into public.workspaces(name,owner_id) values(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1))||'''s Workspace',new.id) returning id into wid;
 insert into public.workspace_members(workspace_id,user_id,role) values(wid,new.id,'owner');
 return new;
end $$;
drop trigger if exists on_auth_user_created_workspace on auth.users;
create trigger on_auth_user_created_workspace after insert on auth.users for each row execute function public.bootstrap_workspace_for_user();

-- Make authorization policies deterministic and non-recursive.
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.client_access enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.audit_logs enable row level security;
drop policy if exists "Users manage their own clients" on public.clients;
drop policy if exists "Users can view accessible clients" on public.clients;
drop policy if exists "Workspace members can view workspace" on public.workspaces;
drop policy if exists "Workspace owner can manage workspace" on public.workspaces;
drop policy if exists "Workspace members can view membership" on public.workspace_members;
drop policy if exists "Owners can manage workspace members" on public.workspace_members;
drop policy if exists "Granter can manage client access" on public.client_access;
drop policy if exists "Users manage their own workspace rows" on public.workspace_rows;
drop policy if exists "Users can access workspace rows for authorized clients" on public.workspace_rows;
drop policy if exists "Users manage their own workspace tables" on public.workspace_tables;
drop policy if exists "Users can access workspace tables for authorized clients" on public.workspace_tables;
drop policy if exists "Workspace member can view" on public.workspaces;
drop policy if exists "Owner manages workspace" on public.workspaces;
drop policy if exists "Member can view own membership" on public.workspace_members;
drop policy if exists "Owner manages members" on public.workspace_members;
drop policy if exists "Client access visible to managers" on public.client_access;
drop policy if exists "Client access managed by owner" on public.client_access;
drop policy if exists "Accessible clients visible" on public.clients;
drop policy if exists "Client owner manages clients" on public.clients;
drop policy if exists "Owner inserts clients" on public.clients;
drop policy if exists "Owner updates clients" on public.clients;
drop policy if exists "Accessible rows read" on public.workspace_rows;
drop policy if exists "Accessible rows write" on public.workspace_rows;
drop policy if exists "Accessible tables read" on public.workspace_tables;
drop policy if exists "Accessible tables write" on public.workspace_tables;
drop policy if exists "Accessible rows insert" on public.workspace_rows;
drop policy if exists "Accessible rows update" on public.workspace_rows;
drop policy if exists "Accessible tables insert" on public.workspace_tables;
drop policy if exists "Accessible tables update" on public.workspace_tables;
drop policy if exists "Invite owner manage" on public.workspace_invitations;
drop policy if exists "Audit owner read" on public.audit_logs;

create policy "Workspace member can view" on public.workspaces for select to authenticated using(public.is_workspace_member(id));
create policy "Owner manages workspace" on public.workspaces for update to authenticated using(public.workspace_role(id)='owner') with check(public.workspace_role(id)='owner');
create policy "Member can view own membership" on public.workspace_members for select to authenticated using(user_id=auth.uid());
create policy "Owner manages members" on public.workspace_members for all to authenticated using(public.workspace_role(workspace_id)='owner') with check(public.workspace_role(workspace_id)='owner');
create policy "Accessible clients visible" on public.clients for select to authenticated using(public.can_access_client(id));
create policy "Owner inserts clients" on public.clients for insert to authenticated with check(public.workspace_role(workspace_id)='owner');
create policy "Owner updates clients" on public.clients for update to authenticated using(public.workspace_role(workspace_id)='owner') with check(public.workspace_role(workspace_id)='owner');
create policy "Client access visible to managers" on public.client_access for select to authenticated using(public.workspace_role((select workspace_id from public.clients c where c.id=client_id)) in ('owner','manager') or user_id=auth.uid());
create policy "Client access managed by owner" on public.client_access for all to authenticated using(public.workspace_role((select workspace_id from public.clients c where c.id=client_id))='owner') with check(public.workspace_role((select workspace_id from public.clients c where c.id=client_id))='owner');
-- Soft-delete flag is filtered by the app's query, not by RLS: PostgreSQL also
-- checks the SELECT policy against the new row version of an UPDATE, so
-- `deleted_at is null` here made archiving impossible (42501).
create policy "Accessible rows read" on public.workspace_rows for select to authenticated using(public.can_access_client(client_id));
create policy "Accessible rows insert" on public.workspace_rows for insert to authenticated with check(public.can_write_client(client_id));
create policy "Accessible rows update" on public.workspace_rows for update to authenticated using(public.can_write_client(client_id)) with check(public.can_write_client(client_id));
drop policy if exists "Workspace rows read" on public.workspace_rows;
drop policy if exists "Workspace rows insert" on public.workspace_rows;
drop policy if exists "Workspace rows update" on public.workspace_rows;
create policy "Workspace rows read" on public.workspace_rows for select to authenticated using(client_id is null and public.is_workspace_member(workspace_id));
create policy "Workspace rows insert" on public.workspace_rows for insert to authenticated with check(client_id is null and workspace_id is not null and public.workspace_role(workspace_id) in ('owner','manager','va'));
create policy "Workspace rows update" on public.workspace_rows for update to authenticated using(client_id is null and public.workspace_role(workspace_id) in ('owner','manager','va')) with check(client_id is null and workspace_id is not null and public.workspace_role(workspace_id) in ('owner','manager','va'));
create policy "Accessible tables read" on public.workspace_tables for select to authenticated using(deleted_at is null and public.can_access_client(client_id));
create policy "Accessible tables insert" on public.workspace_tables for insert to authenticated with check(public.can_write_client(client_id));
create policy "Accessible tables update" on public.workspace_tables for update to authenticated using(public.can_write_client(client_id)) with check(public.can_write_client(client_id));
create policy "Invite owner manage" on public.workspace_invitations for all to authenticated using(public.workspace_role(workspace_id)='owner') with check(public.workspace_role(workspace_id)='owner');
create policy "Audit owner read" on public.audit_logs for select to authenticated using(public.workspace_role(workspace_id)='owner' or (client_id is not null and public.can_access_client(client_id)));

-- Invitation tokens are returned once to the owner and stored only as SHA-256 hashes.
create or replace function public.create_workspace_invitation(p_workspace_id text,p_email text,p_role text,p_client_ids text[] default '{}')
returns text language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare raw_token text; normalized_email text;
begin
 if auth.uid() is null or public.workspace_role(p_workspace_id) is distinct from 'owner' then raise exception 'not authorized'; end if;
 if p_role not in ('manager','va','viewer') then raise exception 'invalid role'; end if;
 normalized_email:=lower(trim(p_email));
 if normalized_email='' or position('@' in normalized_email)=0 then raise exception 'invalid email'; end if;
 if exists(select 1 from unnest(coalesce(p_client_ids,'{}')) as selected(client_id) left join public.clients c on c.id=selected.client_id where c.id is null or c.workspace_id<>p_workspace_id) then raise exception 'invalid client selection'; end if;
 raw_token:=replace(pg_catalog.gen_random_uuid()::text,'-','')||replace(pg_catalog.gen_random_uuid()::text,'-','');
 insert into public.workspace_invitations(workspace_id,email,role,invited_by,token_hash,client_ids,expires_at)
 values(p_workspace_id,normalized_email,p_role,auth.uid(),encode(pg_catalog.sha256(convert_to(raw_token,'UTF8')),'hex'),coalesce(p_client_ids,'{}'),now()+interval '7 days');
 insert into public.audit_logs(workspace_id,actor_user_id,action,resource_type,metadata)
 values(p_workspace_id,auth.uid(),'invited','workspace_member',jsonb_build_object('email',normalized_email,'role',p_role));
 return raw_token;
end $$;
create or replace function public.accept_workspace_invitation(p_token text)
returns text language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare inv public.workspace_invitations%rowtype; caller_email text;
begin
 if auth.uid() is null then raise exception 'not authorized'; end if;
 caller_email:=lower(coalesce(auth.jwt()->>'email',''));
 select * into inv from public.workspace_invitations where token_hash=encode(pg_catalog.sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or inv.accepted_at is not null or inv.expires_at<=now() or inv.email<>caller_email then raise exception 'invitation invalid or expired'; end if;
 if exists(select 1 from public.workspace_members where workspace_id=inv.workspace_id and user_id=auth.uid()) then raise exception 'already a workspace member'; end if;
 insert into public.workspace_members(workspace_id,user_id,role) values(inv.workspace_id,auth.uid(),inv.role)
 on conflict(workspace_id,user_id) do update set role=excluded.role,updated_at=now();
 insert into public.client_access(client_id,user_id,granted_by)
 select c.id,auth.uid(),inv.invited_by from public.clients c where c.workspace_id=inv.workspace_id and c.id=any(inv.client_ids)
 on conflict(client_id,user_id) do nothing;
 update public.workspace_invitations set accepted_at=now() where id=inv.id;
 insert into public.audit_logs(workspace_id,actor_user_id,action,resource_type,resource_id,metadata)
 values(inv.workspace_id,auth.uid(),'accepted_invitation','workspace_member',auth.uid()::text,jsonb_build_object('role',inv.role));
 return inv.workspace_id;
end $$;
revoke all on function public.create_workspace_invitation(text,text,text,text[]) from public;
revoke all on function public.accept_workspace_invitation(text) from public;
grant execute on function public.create_workspace_invitation(text,text,text,text[]),public.accept_workspace_invitation(text) to authenticated;

create or replace function public.list_workspace_members(p_workspace_id text)
returns table(user_id uuid,email text,role text,client_ids text[],joined_at timestamptz)
language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
begin
 if auth.uid() is null or public.workspace_role(p_workspace_id) is distinct from 'owner' then raise exception 'not authorized'; end if;
 return query
 select m.user_id,coalesce(u.email,'')::text,m.role,
   coalesce(access.client_ids,'{}'::text[]),m.created_at
 from public.workspace_members m
 left join auth.users u on u.id=m.user_id
 left join lateral (
   select array_agg(a.client_id order by a.client_id) as client_ids
   from public.client_access a join public.clients c on c.id=a.client_id
   where a.user_id=m.user_id and c.workspace_id=p_workspace_id
 ) access on true
 where m.workspace_id=p_workspace_id order by m.created_at;
end $$;

create or replace function public.revoke_workspace_member(p_workspace_id text,p_user_id uuid)
returns void language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare owner_user_id uuid;
begin
 if auth.uid() is null or public.workspace_role(p_workspace_id) is distinct from 'owner' then raise exception 'not authorized'; end if;
 select w.owner_id into owner_user_id from public.workspaces w where w.id=p_workspace_id;
 if p_user_id=owner_user_id then raise exception 'cannot revoke the workspace owner'; end if;
 if p_user_id=auth.uid() then raise exception 'cannot remove your own workspace access'; end if;
 delete from public.client_access a using public.clients c
 where a.client_id=c.id and c.workspace_id=p_workspace_id and a.user_id=p_user_id;
 delete from public.workspace_members m where m.workspace_id=p_workspace_id and m.user_id=p_user_id;
 if not found then raise exception 'workspace member not found'; end if;
 insert into public.audit_logs(workspace_id,actor_user_id,action,resource_type,resource_id)
 values(p_workspace_id,auth.uid(),'revoked','workspace_member',p_user_id::text);
end $$;
revoke all on function public.list_workspace_members(text),public.revoke_workspace_member(text,uuid) from public;
grant execute on function public.list_workspace_members(text),public.revoke_workspace_member(text,uuid) to authenticated;

-- No hard deletes through the public API. Archive/restore uses archived_at on clients;
-- row/table deletes are denied until the app sends explicit archival updates.

create or replace function public.record_workspace_audit() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare cid text; wid text; rid text; act text;
begin
 cid:=coalesce(new.client_id,old.client_id); rid:=coalesce(new.id,old.id);
 select c.workspace_id into wid from public.clients c where c.id=cid;
 if wid is null then return coalesce(new,old); end if;
 act:=case when tg_op='INSERT' then 'created' when tg_op='DELETE' then 'deleted' else 'updated' end;
 insert into public.audit_logs(workspace_id,client_id,actor_user_id,action,resource_type,resource_id)
 values(wid,cid,auth.uid(),act,tg_table_name,rid);
 return coalesce(new,old);
end $$;
drop trigger if exists audit_workspace_rows on public.workspace_rows;
create trigger audit_workspace_rows after insert or update or delete on public.workspace_rows for each row execute function public.record_workspace_audit();
drop trigger if exists audit_workspace_tables on public.workspace_tables;
create trigger audit_workspace_tables after insert or update or delete on public.workspace_tables for each row execute function public.record_workspace_audit();


-- In-app Dropdesk ID invitations. This mirrors the migration below.

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

-- === shared table per-member access (mirrors migration 20261026) ===
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
  using (client_id is null and public.can_view_shared_table(workspace_id));

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

-- === shared row attribution (mirrors migration 20261028) ===
-- "Added by" labels for the shared Product hunting table. workspace_rows.user_id
-- already records the creator; this RPC resolves that id to a display name for
-- every workspace member without exposing emails or opening up user_profiles.
create or replace function public.list_workspace_labels(p_workspace_id text)
returns table(user_id uuid, display_name text, public_id text)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null or not public.is_workspace_member(p_workspace_id) then
    raise exception 'not authorized';
  end if;

  return query
  with people as (
    select m.user_id
    from public.workspace_members m
    where m.workspace_id = p_workspace_id
    union
    select w.owner_id
    from public.workspaces w
    where w.id = p_workspace_id
    union
    select r.user_id
    from public.workspace_rows r
    where r.workspace_id = p_workspace_id and r.deleted_at is null and r.user_id is not null
  )
  select people.user_id,
         coalesce(
           nullif(profile.display_name, ''),
           nullif(account.raw_user_meta_data->>'full_name', ''),
           nullif(account.raw_user_meta_data->>'name', ''),
           nullif(split_part(coalesce(account.email, ''), '@', 1), ''),
           'Team member'
         )::text,
         coalesce(profile.public_id, '')::text
  from people
  left join public.user_profiles profile on profile.user_id = people.user_id
  left join auth.users account on account.id = people.user_id
  order by 2;
end $$;

revoke all on function public.list_workspace_labels(text) from public;
grant execute on function public.list_workspace_labels(text) to authenticated;


