-- ============================================================================
-- Dropdesk pre-launch wipe
-- ----------------------------------------------------------------------------
-- Scope (your choice): keep every account, workspace and owner membership.
-- Delete all operational data: clients, table rows, imported tables, client
-- access grants, invitations and audit entries.
--
-- SAFETY:
--  * Everything is copied into schema backup_prelaunch_20261020 FIRST.
--  * The whole script runs in one transaction. If any statement fails, nothing
--    is deleted and nothing is backed up (you can simply re-run it).
--  * Running it a second time fails harmlessly on "relation already exists"
--    and rolls back, so you cannot wipe the post-wipe state twice.
--
-- RESTORE (if you need the data back, after deleting the wipe):
--   insert into public.workspaces           select * from backup_prelaunch_20261020.workspaces;
--   insert into public.workspace_members    select * from backup_prelaunch_20261020.workspace_members;
--   insert into public.user_profiles        select * from backup_prelaunch_20261020.user_profiles;
--   insert into public.clients              select * from backup_prelaunch_20261020.clients;
--   insert into public.client_access        select * from backup_prelaunch_20261020.client_access;
--   insert into public.workspace_rows       select * from backup_prelaunch_20261020.workspace_rows;
--   insert into public.workspace_tables     select * from backup_prelaunch_20261020.workspace_tables;
--   insert into public.workspace_invitations select * from backup_prelaunch_20261020.workspace_invitations;
--   insert into public.audit_logs           select * from backup_prelaunch_20261020.audit_logs;
-- ============================================================================

begin;

-- 1. Back up every table we are about to touch -------------------------------
create schema if not exists backup_prelaunch_20261020;

create table backup_prelaunch_20261020.workspaces           as table public.workspaces;
create table backup_prelaunch_20261020.workspace_members    as table public.workspace_members;
create table backup_prelaunch_20261020.user_profiles        as table public.user_profiles;
create table backup_prelaunch_20261020.clients              as table public.clients;
create table backup_prelaunch_20261020.client_access        as table public.client_access;
create table backup_prelaunch_20261020.workspace_rows       as table public.workspace_rows;
create table backup_prelaunch_20261020.workspace_tables     as table public.workspace_tables;
create table backup_prelaunch_20261020.workspace_invitations as table public.workspace_invitations;
create table backup_prelaunch_20261020.audit_logs           as table public.audit_logs;

-- 2. Record what is there now ------------------------------------------------
create temp table _wipe_counts (phase text, table_name text, row_count bigint) on commit preserve rows;

insert into _wipe_counts
select 'before', 'clients', count(*) from public.clients
union all select 'before', 'workspace_rows', count(*) from public.workspace_rows
union all select 'before', 'workspace_tables', count(*) from public.workspace_tables
union all select 'before', 'client_access', count(*) from public.client_access
union all select 'before', 'workspace_invitations', count(*) from public.workspace_invitations
union all select 'before', 'audit_logs', count(*) from public.audit_logs
union all select 'before', 'workspace_members', count(*) from public.workspace_members
union all select 'before', 'workspaces', count(*) from public.workspaces
union all select 'before', 'user_profiles', count(*) from public.user_profiles;

-- 3. Delete operational data (children first) --------------------------------
-- workspace_rows / workspace_tables deletes also fire the audit trigger, which
-- is why audit_logs is cleared last among the children.
delete from public.workspace_rows;
delete from public.workspace_tables;
delete from public.client_access;
delete from public.workspace_invitations;
delete from public.audit_logs;
delete from public.clients;

-- 4. Drop leftovers whose account no longer exists (normally zero rows) ------
delete from public.workspace_members m
where not exists (select 1 from auth.users u where u.id = m.user_id);

delete from public.user_profiles p
where not exists (select 1 from auth.users u where u.id = p.user_id);

delete from public.workspaces w
where not exists (select 1 from auth.users u where u.id = w.owner_id);

-- 5. Record the result -------------------------------------------------------
insert into _wipe_counts
select 'after', 'clients', count(*) from public.clients
union all select 'after', 'workspace_rows', count(*) from public.workspace_rows
union all select 'after', 'workspace_tables', count(*) from public.workspace_tables
union all select 'after', 'client_access', count(*) from public.client_access
union all select 'after', 'workspace_invitations', count(*) from public.workspace_invitations
union all select 'after', 'audit_logs', count(*) from public.audit_logs
union all select 'after', 'workspace_members', count(*) from public.workspace_members
union all select 'after', 'workspaces', count(*) from public.workspaces
union all select 'after', 'user_profiles', count(*) from public.user_profiles;

select table_name,
       max(row_count) filter (where phase = 'before') as before,
       max(row_count) filter (where phase = 'after')  as after
from _wipe_counts
group by table_name
order by table_name;

-- 6. Confirm the accounts you keep are untouched -----------------------------
select u.email,
       (select count(*) from public.workspace_members m where m.user_id = u.id and m.role = 'owner') as owner_workspaces,
       (select count(*) from public.workspaces w where w.owner_id = u.id) as workspaces_owned,
       (select count(*) from public.user_profiles p where p.user_id = u.id) as has_dropdesk_id
from auth.users u
order by u.created_at;

commit;
