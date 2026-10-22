-- Fix: soft-deleting a row through the authenticated API was always rejected.
--
-- PostgreSQL applies the SELECT policies to the *new* row version of an UPDATE
-- as well as to the old one (an UPDATE may read and write the same row). Our
-- read policies required `deleted_at is null`, so the app's archive statement
--
--   update public.workspace_rows
--      set deleted_at = now(), deleted_by = <uid>
--    where ...
--
-- failed with:
--
--   42501 new row violates row-level security policy for table "workspace_rows"
--
-- The client sent that request fire-and-forget, so the row vanished from the
-- deleter's screen only. It stayed in Postgres with deleted_at = null and every
-- other workspace member kept loading it after a refresh.
--
-- Fix: RLS keeps deciding *who* may read a row; the app already asks only for
-- live rows (`workspace_rows?deleted_at=is.null`), so the policies no longer
-- need to filter the soft-delete flag themselves. This also keeps the existing
-- "upsert every row in memory" sync working when a stale tab still holds a row
-- that someone else archived (the upsert can update it but never clears
-- deleted_at).
--
-- Note: rows that were "deleted" before this fix were never archived, so they
-- are still live. Delete them once more after applying this migration.
--
-- Safe to re-run.

-- Per-client rows (Product hunting / Listings / Orders inside a client).
drop policy if exists "Accessible rows read" on public.workspace_rows;
create policy "Accessible rows read" on public.workspace_rows
  for select to authenticated
  using (public.can_access_client(client_id));

-- Rows of the client-less, workspace-wide Product hunting table.
drop policy if exists "Workspace rows read" on public.workspace_rows;
create policy "Workspace rows read" on public.workspace_rows
  for select to authenticated
  using (client_id is null and public.can_view_shared_table(workspace_id));

-- Verification: both read policies must no longer mention deleted_at.
select 'Accessible rows read' as check_name,
       (coalesce(qual, '') not like '%deleted_at%')::text as ok
from pg_policies
where schemaname = 'public' and tablename = 'workspace_rows'
  and policyname = 'Accessible rows read'
union all
select 'Workspace rows read',
       (coalesce(qual, '') not like '%deleted_at%')::text
from pg_policies
where schemaname = 'public' and tablename = 'workspace_rows'
  and policyname = 'Workspace rows read';
