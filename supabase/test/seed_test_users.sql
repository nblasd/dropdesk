-- Dropdesk: create two throwaway, pre-confirmed test accounts so the
-- invitation + permission flow can be tested end to end.
-- Run AFTER apply_pending_migrations.sql. Delete later with cleanup_test_users.sql.

set search_path = public, extensions, auth, pg_temp;

create or replace function public.__dropdesk_seed_user(
  p_email text, p_name text, p_password text
) returns uuid
language plpgsql as $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = lower(p_email);
  if v_uid is not null then
    return v_uid;
  end if;

  v_uid := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_uid,
    'authenticated',
    'authenticated',
    lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_name, 'name', p_name),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', lower(p_email), 'email_verified', true),
    'email',
    v_uid::text,
    now(), now(), now()
  );

  return v_uid;
end $$;

select public.__dropdesk_seed_user('dropdesk.owner@example.com',  'Dropdesk Owner',  'DropdeskTest!2026') as owner_id;
select public.__dropdesk_seed_user('dropdesk.member@example.com', 'Dropdesk Member', 'DropdeskTest!2026') as member_id;

-- Show the accounts and their Dropdesk IDs.
select u.email,
       p.public_id as dropdesk_id,
       p.display_name,
       (u.email_confirmed_at is not null) as confirmed
from auth.users u
left join public.user_profiles p on p.user_id = u.id
where u.email in ('dropdesk.owner@example.com', 'dropdesk.member@example.com')
order by u.email;

drop function if exists public.__dropdesk_seed_user(text, text, text);
