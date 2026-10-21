-- Dropdesk: remove the two throwaway test accounts and everything they own.
-- Cascades cover user_profiles, workspaces, workspace_members, clients,
-- workspace_rows, workspace_tables, client_access, workspace_invitations
-- and audit_logs. Row-level operations run as the SQL editor's server role,
-- so RLS does not block the cleanup.

delete from auth.users
where email in ('dropdesk.owner@example.com', 'dropdesk.member@example.com');

select count(*) as remaining_test_accounts
from auth.users
where email in ('dropdesk.owner@example.com', 'dropdesk.member@example.com');
