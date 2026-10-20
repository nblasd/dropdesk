-- auth.users.email is varchar, while the RPC declares email as text.
-- Cast it explicitly so RETURN QUERY matches the declared table type.
create or replace function public.list_workspace_members(p_workspace_id text)
returns table(user_id uuid, email text, role text, client_ids text[], joined_at timestamptz)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null or public.workspace_role(p_workspace_id) <> 'owner' then
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

revoke all on function public.list_workspace_members(text) from public;
grant execute on function public.list_workspace_members(text) to authenticated;
