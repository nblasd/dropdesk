-- Repair accounts that existed before the workspace bootstrap trigger was added.
-- Earlier versions only created owner workspaces for users who already had clients,
-- leaving empty accounts without an owner membership or workspace ID.
insert into public.workspaces(name, owner_id)
select coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)) || '''s Workspace', u.id
from auth.users u
where not exists (select 1 from public.workspaces w where w.owner_id = u.id);

insert into public.workspace_members(workspace_id, user_id, role)
select w.id, w.owner_id, 'owner' from public.workspaces w
on conflict (workspace_id, user_id) do update set role = 'owner', updated_at = now();

update public.clients c
set workspace_id = w.id,
    created_by = coalesce(c.created_by, c.user_id),
    updated_by = coalesce(c.updated_by, c.user_id)
from public.workspaces w
where c.user_id = w.owner_id and c.workspace_id is null;

-- Return member identities and explicitly granted client IDs to the owner UI.
create or replace function public.list_workspace_members(p_workspace_id text)
returns table(user_id uuid, email text, role text, client_ids text[], joined_at timestamptz)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null or public.workspace_role(p_workspace_id) <> 'owner' then
    raise exception 'not authorized';
  end if;

  return query
  select m.user_id, coalesce(u.email, ''), m.role,
         coalesce(array_agg(a.client_id) filter (where a.client_id is not null), '{}'::text[]), m.created_at
  from public.workspace_members m
  left join auth.users u on u.id = m.user_id
  left join public.client_access a on a.user_id = m.user_id
  left join public.clients c on c.id = a.client_id and c.workspace_id = p_workspace_id
  where m.workspace_id = p_workspace_id
    and (a.client_id is null or c.id is not null)
  group by m.user_id, u.email, m.role, m.created_at
  order by m.created_at;
end $$;

create or replace function public.revoke_workspace_member(p_workspace_id text, p_user_id uuid)
returns void language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare owner_user_id uuid;
begin
  if auth.uid() is null or public.workspace_role(p_workspace_id) <> 'owner' then
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

revoke all on function public.list_workspace_members(text) from public;
revoke all on function public.revoke_workspace_member(text, uuid) from public;
grant execute on function public.list_workspace_members(text), public.revoke_workspace_member(text, uuid) to authenticated;
