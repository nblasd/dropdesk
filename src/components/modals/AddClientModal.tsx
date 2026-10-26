import { Plus, Store, Users } from "lucide-react";

export function AddClientModal({
  name,
  setName,
  busy,
  onAdd,
}: {
  name: string;
  setName: (value: string) => void;
  busy: boolean;
  onAdd: () => void;
}) {
  return (
    <>
      <span className="modal-icon mint">
        <Users size={19} />
      </span>
      <h2>Add a client</h2>
      <p>Create a workspace for your client’s stores, product ideas, listings, and orders.</p>
      <label>CLIENT NAME</label>
      <input
        autoFocus
        className="modal-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
        placeholder="e.g. Alex Morgan"
      />
      <div className="modal-note">
        <Store size={15} /> You can add their store name and details later.
      </div>
      <button className="button primary modal-submit" onClick={onAdd} disabled={busy}>
        <Plus size={16} />
        {busy ? "Creating workspace…" : "Create workspace"}
      </button>
    </>
  );
}
