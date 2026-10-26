import { Store, Trash2 } from "lucide-react";

type ClientSettingsDraft = { id: string; name: string; store: string; color: string };

const palette = ["#e6e7dc", "#f3ded8", "#dce8ef", "#e9e3f2", "#f6eccf", "#dff0e4"];

export function ClientSettingsModal({
  draft,
  setDraft,
  onSave,
  onDelete,
  onClose,
}: {
  draft: ClientSettingsDraft;
  setDraft: (value: ClientSettingsDraft) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <form
      className="client-settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <span className="modal-icon mint">
        <Store size={19} />
      </span>
      <h2>Client settings</h2>
      <p>Update how this client appears across your workspace.</p>

      <label htmlFor="client-settings-name">CLIENT NAME</label>
      <input
        id="client-settings-name"
        autoFocus
        className="modal-input"
        value={draft.name}
        onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        placeholder="e.g. Alex Morgan"
      />

      <label htmlFor="client-settings-store">STORE NAME</label>
      <input
        id="client-settings-store"
        className="modal-input"
        value={draft.store}
        onChange={(event) => setDraft({ ...draft, store: event.target.value })}
        placeholder="e.g. Alex’s Store"
      />

      <label>AVATAR COLOUR</label>
      <div className="color-swatches">
        {palette.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Use colour ${color}`}
            className={`color-swatch ${draft.color === color ? "selected" : ""}`}
            style={{ background: color }}
            onClick={() => setDraft({ ...draft, color })}
          />
        ))}
      </div>

      <div className="modal-actions">
        <button className="button secondary" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="button primary" type="submit">
          Save changes
        </button>
      </div>

      <div className="modal-danger">
        <p>Deleting removes this client’s rows and imported tables.</p>
        <button className="button danger" type="button" onClick={onDelete}>
          <Trash2 size={14} /> Delete client
        </button>
      </div>
    </form>
  );
}
