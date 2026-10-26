import { Trash2 } from "lucide-react";
import type { Client } from "@/lib/types";

export function DeleteClientModal({
  client,
  busy,
  onConfirm,
  onCancel,
}: {
  client: Client;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <span className="modal-icon peach">
        <Trash2 size={19} />
      </span>
      <h2>Delete {client.name}?</h2>
      <p>
        This archives {client.name} and hides it from normal workspace views. An owner can restore it from the database.
      </p>
      <div className="modal-actions">
        <button className="button secondary" type="button" onClick={onCancel} disabled={busy}>
          Keep client
        </button>
        <button className="button danger" type="button" onClick={onConfirm} disabled={busy}>
          {busy ? "Archiving…" : "Archive client"}
        </button>
      </div>
    </>
  );
}
