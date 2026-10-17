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
