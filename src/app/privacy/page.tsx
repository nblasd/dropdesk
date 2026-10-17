import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy — Dropdesk",
  description: "How Dropdesk collects, stores, and deletes your account and workspace data.",
};

const updated = "October 18, 2026";

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <header className="legal-nav">
        <Link href="/" className="legal-brand">
          dropdesk<span>.</span>
        </Link>
        <Link href="/" className="legal-back">
          Back to app
        </Link>
      </header>

      <article className="legal-body">
        <p className="legal-kicker">PRIVACY POLICY</p>
        <h1>Your workspace stays yours.</h1>
        <p className="legal-updated">Last updated {updated}</p>

        <h2>What we collect</h2>
        <p>
          When you create an account we store your name and email address. If you sign in with Google, we
          receive your name, email address, and Google account identifier — never your Google password.
          Everything you enter into a workspace (clients, products, listings, orders, and imported
          spreadsheets) is stored as your account data.
        </p>

        <h2>How it is stored</h2>
        <p>
          Accounts and workspace data are stored in Supabase, our hosted Postgres provider, and access is
          restricted to your own account by row-level security policies. The site is served by Vercel. If
          you use the app before signing in, your demo workspaces stay in your own browser&apos;s local
          storage and are never uploaded.
        </p>

        <h2>What we do not do</h2>
        <p>
          We do not sell your data, rent it, or use it to train advertising profiles. We do not read your
          workspace contents except where needed to operate the service or comply with the law.
        </p>

        <h2>Third parties</h2>
        <p>
          We rely on Supabase for authentication and database hosting, Vercel for hosting and deployment,
          and Google only when you choose to sign in with a Google account. Each provider processes data on
          our behalf under its own privacy terms.
        </p>

        <h2>Keeping and deleting your data</h2>
        <p>
          Your data is kept while your account exists. You can delete individual clients, tables, and rows in
          the app at any time. To delete your whole account and its workspace data, email us and we will
          remove it.
        </p>

        <h2>Cookies and local storage</h2>
        <p>
          We use storage required to keep you signed in and to remember local demo workspaces. We do not use
          advertising cookies.
        </p>

        <h2>Children</h2>
        <p>Dropdesk is not intended for anyone under 16, and we do not knowingly collect their data.</p>

        <h2>Contact</h2>
        <p>
          Questions about this policy, or a deletion request? Email{" "}
          <a href="mailto:gameranonymous338@gmail.com">gameranonymous338@gmail.com</a>.
        </p>
      </article>
    </main>
  );
}
