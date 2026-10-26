import { Users, X } from "lucide-react";
import type { Client, InviteRecipient } from "@/lib/types";

type InviteRole = "manager" | "va" | "viewer";

export function InviteModal({
  publicId,
  setPublicId,
  recipient,
  lookupBusy,
  onFind,
  role,
  setRole,
  clients,
  selected,
  setSelected,
  busy,
  onCreate,
  onClose,
  error,
  recipientIsMember,
  sharedTable,
  setSharedTable,
}: {
  publicId: string;
  setPublicId: (value: string) => void;
  recipient: InviteRecipient | null;
  lookupBusy: boolean;
  onFind: () => void;
  role: InviteRole;
  setRole: (value: InviteRole) => void;
  clients: Client[];
  selected: string[];
  setSelected: (value: string[]) => void;
  busy: boolean;
  onCreate: () => void;
  onClose: () => void;
  error: string;
  recipientIsMember: boolean;
  sharedTable: boolean;
  setSharedTable: (value: boolean) => void;
}) {
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);

  return (
    <form
      className="invite-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (recipient) onCreate();
        else onFind();
      }}
    >
      <span className="modal-icon mint">
        <Users size={19} />
      </span>
      <h2>Invite a teammate</h2>
      <p>Enter their Dropdesk ID to find their account. The invitation will appear in their notifications.</p>

      <label htmlFor="invite-public-id">DROPdesk ID</label>
      <div className="invite-id-search">
        <input
          id="invite-public-id"
          className="modal-input"
          autoFocus
          required
          value={publicId}
          onChange={(e) => setPublicId(e.target.value)}
          placeholder="DD-1234ABCD5678EF90"
        />
        <button className="button secondary" type="button" onClick={onFind} disabled={lookupBusy}>
          {lookupBusy ? "Searching…" : "Find user"}
        </button>
      </div>

      {recipient && (
        <div className="invite-recipient">
          <span className="profile-avatar">{recipient.display_name.slice(0, 2).toUpperCase()}</span>
          <span>
            <b>{recipient.display_name}</b>
            <small>{recipient.public_id}</small>
          </span>
          <button type="button" onClick={() => setPublicId("")} aria-label="Clear selected user">
            <X size={15} />
          </button>
        </div>
      )}

      <label htmlFor="invite-role">ROLE</label>
      <select id="invite-role" className="modal-input" value={role} onChange={(e) => setRole(e.target.value as InviteRole)}>
        <option value="manager">Manager — edit data</option>
        <option value="va">VA — create and edit data</option>
        <option value="viewer">Viewer — read only</option>
      </select>

      <label className="invite-shared">
        <input type="checkbox" checked={sharedTable} onChange={() => setSharedTable(!sharedTable)} />
        <span>Shared product table</span>
        <small>Access to the client-less Product hunting table, no clients required</small>
      </label>

      <label>CLIENT ACCESS</label>
      <div className="invite-client-list">
        {clients.map((client) => (
          <label key={client.id} className="invite-client-option">
            <input type="checkbox" checked={selected.includes(client.id)} onChange={() => toggle(client.id)} />
            <span>{client.name}</span>
            <small>{client.visibility ?? "selected"}</small>
          </label>
        ))}
      </div>

      <p className="invite-help">
        Ask your teammate for their Dropdesk ID — they can copy it from Settings → Your Dropdesk ID. Clients not selected remain hidden. Workspace-visible
        clients can still be seen by all workspace members.
      </p>
      {recipientIsMember && <p className="invite-error">{recipient?.display_name} is already a member of this workspace.</p>}
      {error && <p className="invite-error">{error}</p>}

      <div className="modal-actions">
        <button className="button secondary" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="button primary" type="submit" disabled={busy || lookupBusy || !recipient || recipientIsMember}>
          {busy ? "Sending…" : "Send invitation"}
        </button>
      </div>
    </form>
  );
}
