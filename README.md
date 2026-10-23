# Dropdesk

A Next.js workspace for managing several dropshipping clients from one account. The starter includes product hunting, eBay listing tracking, order fulfillment and profit calculations, editable tables, search, source filtering, client workspaces, and CSV spreadsheet exports.

## Live site

Deployed on Vercel at [dropdesk-eta.vercel.app](https://dropdesk-eta.vercel.app). The Vercel project is connected to this repository, so every push to `main` triggers a new production deployment automatically. No manual upload or local build is needed.

## Run locally

Install Node.js 20.9 or later, then run:

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase environment variables, the app runs in demo mode. Demo workspaces are saved in this browser's local storage and are not shared across devices or accounts.

## Connect Supabase (free to start)

Supabase provides hosted Postgres and passwordless email OTP authentication. Create a project, copy `.env.example` to `.env.local`, and fill in the project URL and anon/publishable key. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql). Then configure Authentication → Providers → Email to enable email OTP and set your site URL / redirect URLs to your local and deployed domains.

The UI auth dialog sends and verifies Supabase email OTPs when credentials are present. After sign-in, clients and table rows load from and save to Supabase; row access is protected by the included row-level security policies. Supabase's built-in email sender is intended for evaluation and has tight rate limits; configure a custom SMTP provider for a production signup flow. Without credentials, demo workspaces remain local browser data and are not shared across devices or accounts. Do not treat demo mode as a hosted multi-user database.

## Deploy on Vercel

The project is already imported in Vercel, where it is detected as Next.js with the root directory at `./`. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in the project's environment variables for Production and Preview. Keep the Supabase service-role key out of browser environment variables.

To ship a change, commit and push to `main`; Vercel builds the deployment and swaps the production domain when the build succeeds. Pull requests and other branches get their own preview deployments.

## Suggested next steps

- Add team invitations and per-client access if clients will log in themselves.
- Set your preferred marketplace fee calculation and currency per client.
- Configure custom SMTP, backups, and conflict-safe row synchronization before relying on it with paying clients. The starter sync is optimized for a single operator editing one browser at a time.

## Workspaces and access control

Apply [`supabase/migrations/20261018_secure_multi_client_access.sql`](supabase/migrations/20261018_secure_multi_client_access.sql) followed by [`supabase/migrations/20261019_repair_owner_workspaces.sql`](supabase/migrations/20261019_repair_owner_workspaces.sql) to an existing project, or run [`supabase/schema.sql`](supabase/schema.sql) for a fresh project. Then apply [`supabase/migrations/20261027_fix_soft_delete_rls.sql`](supabase/migrations/20261027_fix_soft_delete_rls.sql): it fixes row deletion for already-provisioned projects. PostgreSQL evaluates SELECT policies against the new row version of an UPDATE, so read policies that filtered `deleted_at` silently rejected every archive request (`42501`); deleted Product hunting rows therefore kept loading for other workspace members. The app still hides archived rows in its own query. The repair migration provisions an owner workspace and membership for existing accounts that were created before workspace bootstrapping, including accounts with no clients. New accounts receive an owner workspace through an `auth.users` trigger.

Workspace membership is separate from client access. Roles are `owner`, `manager`, `va`, and `viewer`; client visibility is `workspace` (all workspace members), `selected` (owner and explicitly granted members), or `private` (owner and explicitly granted members). PostgreSQL RLS filters client, row, and imported-table reads and writes. Hard deletion is not available through the authenticated API; clients and operational rows use archive timestamps. Workspace owners can create a seven-day invitation with `create_workspace_invitation(workspace_id,email,role,client_ids)`, accept with `accept_workspace_invitation(token)`, list members with `list_workspace_members(workspace_id)`, and remove a member with `revoke_workspace_member(workspace_id,user_id)`. The create function returns the raw random token once; only its hash is stored. Invitation delivery remains a copyable link rather than an email.

Audit records currently capture operational row/table create, update, and delete events plus invitation create/accept and workspace member revocation events. Audit records omit row before/after values. Existing demo/local-storage mode is browser-local and is not a multi-user security boundary; use authenticated Supabase mode for shared access.

## Row attribution

Every row in the shared Product hunting table shows an **Added by** badge with the creator's initials and display name. The creator is stored in `workspace_rows.user_id` and is preserved when another member edits the row, so the badge keeps pointing at the person who originally added the product. Apply [`supabase/migrations/20261028_workspace_row_attribution.sql`](supabase/migrations/20261028_workspace_row_attribution.sql) to an existing project: existing rows are labelled automatically because they already carry their creator's user ID. The migration adds `list_workspace_labels(workspace_id)`, a guarded read-only RPC that resolves member IDs to display names (and Dropdesk IDs) without exposing emails or opening up `user_profiles` to other users.
