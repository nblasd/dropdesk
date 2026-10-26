import { Settings2 } from "lucide-react";

export function RowEditModal({
  title,
  draft,
  fields,
  setDraft,
  onSave,
  onClose,
}: {
  title: string;
  draft: Record<string, any>;
  fields: string[];
  setDraft: (value: Record<string, any>) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <form
      className="row-edit-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <span className="modal-icon mint">
        <Settings2 size={19} />
      </span>
      <h2>Edit row</h2>
      <p>Update this {title.toLowerCase()} record. Calculated profit fields update automatically.</p>

      <div className="row-edit-fields">
        {fields.map((field) => (
          <label key={field} className="row-edit-field" htmlFor={`edit-${field}`}>
            <span>{field.replace(/([A-Z])/g, " $1").replaceAll("_", " ").toUpperCase()}</span>
            <input
              id={`edit-${field}`}
              autoFocus={fields[0] === field}
              type={typeof draft[field] === "number" ? "number" : "text"}
              step={typeof draft[field] === "number" ? "0.01" : undefined}
              className="modal-input"
              value={draft[field] ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, [field]: typeof draft[field] === "number" ? Number(event.target.value) || 0 : event.target.value })
              }
            />
          </label>
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
    </form>
  );
}
