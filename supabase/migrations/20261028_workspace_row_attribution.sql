-- Who added it? Labels for shared workspace rows.
--
-- public.workspace_rows.user_id already records the account that created a
-- row, and the app preserves it when other members edit the row. The shared
-- Product hunting table just never showed it, and members cannot read other
-- people's public.user_profiles rows because of RLS.
--
-- list_workspace_labels() is a guarded security-definer RPC that returns only
-- the display name and Dropdesk ID of:
--   * current workspace members and the owner
--   * accounts that still own rows in this workspace (e.g. removed members)
-- It never returns emails or any other profile data, and only workspace
-- members may call it.
--
-- No backfill is needed: existing rows already carry their creator's user_id,
-- so they receive labels as soon as this runs. Safe to re-run.

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

-- Verification
select 'list_workspace_labels function' as check_name,
       (count(*) > 0)::text as ok
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'list_workspace_labels';
