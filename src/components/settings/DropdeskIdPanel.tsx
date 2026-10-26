import { Copy } from "lucide-react";

export function DropdeskIdPanel({ publicId, onCopy }: { publicId: string; onCopy: () => void }) {
  return (
    <section className="panel dropdesk-id-panel">
      <div className="panel-heading">
        <div>
          <h3>Your Dropdesk ID</h3>
          <p>Share this ID with a workspace owner so they can invite you to their workspace.</p>
        </div>
        <button className="button secondary" onClick={onCopy}>
          <Copy size={14} /> Copy ID
        </button>
      </div>
      <div className="dropdesk-id-value">
        <b>{publicId || "Still loading…"}</b>
        <small>
          {publicId
            ? "This ID identifies your account. It is not a password — anyone with it can invite you, so only accept invitations you expect."
            : "Could not load your ID yet. Reload the page, or sign in if you are in demo mode."}
        </small>
      </div>
    </section>
  );
}
