import { useState } from "react";
import { Trash2 } from "lucide-react";

// Deleting a row is immediate in the data layer, so the UI asks first. Orders
// and listings also require typing the row id (or DELETE for a bulk selection)
// so a stray click can never archive a real record.
export function DeleteRowModal({
  rows,
  noun,
  confirmText,
  busy,
  onConfirm,
  onCancel,
}: {
  rows: Record<string, any>[];
  noun: string;
  confirmText?: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const count = rows.length;
  const single = count === 1 ? rows[0] : null;
  const detail = single ? single.title ?? single.item ?? single.id ?? "" : "";
  const label = count === 1 ? noun : `${noun}s`;
  const confirmed = !confirmText || typed.trim().toLowerCase() === confirmText.toLowerCase();

  return (
    <>
      <span className="modal-icon peach">
        <Trash2 size={19} />
      </span>
      <h2>{count === 1 ? `Delete ${noun}?` : `Delete ${count} ${label}?`}</h2>
      <p>
        {count === 1 ? (
          <>
            <b>{detail}</b> will be removed from this table for everyone in the workspace. An owner can restore it from the database.
          </>
        ) : (
          <>
            The {count} selected {label} will be removed from this table for everyone in the workspace. An owner can restore them from the
            database.
          </>
        )}
      </p>
      {confirmText && (
        <>
          <label htmlFor="delete-row-confirm">TYPE {confirmText.toUpperCase()} TO CONFIRM</label>
          <input
            id="delete-row-confirm"
            className="modal-input"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={confirmText}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
        </>
      )}
      <div className="modal-actions">
        <button className="button secondary" type="button" onClick={onCancel} disabled={busy}>
          Keep {count === 1 ? noun : `${count} ${label}`}
        </button>
        <button className="button danger" type="button" onClick={onConfirm} disabled={busy || !confirmed}>
          {busy ? "Deleting…" : count === 1 ? `Delete ${noun}` : `Delete ${count} ${label}`}
        </button>
      </div>
    </>
  );
}
