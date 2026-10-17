# Dropdesk

A Next.js workspace for managing several dropshipping clients from one account. The starter includes product hunting, eBay listing tracking, order fulfillment and profit calculations, editable tables, search, source filtering, client workspaces, and CSV spreadsheet exports.

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

Push this folder to a Git repository and import it in Vercel. Vercel detects Next.js automatically. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the project's environment variables. Keep the Supabase service-role key out of browser environment variables.

## Suggested next steps

- Add team invitations and per-client access if clients will log in themselves.
- Set your preferred marketplace fee calculation and currency per client.
- Configure custom SMTP, backups, and conflict-safe row synchronization before relying on it with paying clients. The starter sync is optimized for a single operator editing one browser at a time.
