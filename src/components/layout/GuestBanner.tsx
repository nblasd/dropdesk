import { ArrowUpRight, Sparkles } from "lucide-react";

export function GuestBanner({ hasClients, onCreateAccount }: { hasClients: boolean; onCreateAccount: () => void }) {
  return (
    <div className="guest-banner">
      <span className="guest-badge">
        <Sparkles size={14} /> PREVIEW
      </span>
      <span className="guest-message">
        <b>{hasClients ? "Preview workspace." : "Your workspace starts empty."}</b>{" "}
        {hasClients
          ? "Your test data stays in this browser until you create an account."
          : "Create a free account to save the clients, listings, and orders you add."}
      </span>
      <button className="button primary guest-cta" onClick={onCreateAccount}>
        Create free account <ArrowUpRight size={14} />
      </button>
    </div>
  );
}
