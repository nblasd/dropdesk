import type { FormEvent } from "react";
import { ArrowUpRight, BadgeCheck } from "lucide-react";

export function AuthModal({
  mode,
  onSwitchMode,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  busy,
  onSubmit,
  onGoogle,
}: {
  mode: "signup" | "login";
  onSwitchMode: () => void;
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  busy: boolean;
  onSubmit: (event: FormEvent) => void;
  onGoogle: () => void;
}) {
  const isSignup = mode === "signup";

  return (
    <>
      <span className="modal-icon lavender">
        <BadgeCheck size={19} />
      </span>
      <h2>{isSignup ? "Create your Dropdesk account" : "Welcome back"}</h2>
      <p>{isSignup ? "Start organizing client stores, products, listings, and orders." : "Sign in to continue to your workspace."}</p>

      <button className="google-auth-button" type="button" onClick={onGoogle}>
        <span className="google-g">G</span>Continue with Google
      </button>
      <div className="auth-divider">
        <span />
        or continue with email
        <span />
      </div>

      <form onSubmit={onSubmit}>
        {isSignup && (
          <>
            <label htmlFor="auth-name">YOUR NAME</label>
            <input
              id="auth-name"
              autoComplete="name"
              className="modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </>
        )}
        <label htmlFor="auth-email">EMAIL ADDRESS</label>
        <input
          id="auth-email"
          autoFocus
          type="email"
          autoComplete="email"
          className="modal-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <label htmlFor="auth-password">PASSWORD</label>
        <input
          id="auth-password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={8}
          className="modal-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
        />
        <button className="button primary modal-submit" type="submit" disabled={busy}>
          {busy ? (isSignup ? "Creating account…" : "Signing in…") : isSignup ? "Create account" : "Sign in"}
          <ArrowUpRight size={15} />
        </button>
      </form>

      <button className="auth-mode-switch" type="button" onClick={onSwitchMode}>
        {isSignup ? "Already have an account? Sign in" : "New to Dropdesk? Create an account"}
      </button>
      <div className="modal-note">
        <BadgeCheck size={15} /> Your workspace is private to your account.
      </div>
    </>
  );
}
