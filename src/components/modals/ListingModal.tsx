import { ClipboardList, Plus } from "lucide-react";

export function ListingModal({
  title,
  setTitle,
  sourceUrl,
  setSourceUrl,
  listedDate,
  setListedDate,
  onAdd,
}: {
  title: string;
  setTitle: (value: string) => void;
  sourceUrl: string;
  setSourceUrl: (value: string) => void;
  listedDate: string;
  setListedDate: (value: string) => void;
  onAdd: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAdd();
      }}
    >
      <span className="modal-icon peach">
        <ClipboardList size={19} />
      </span>
      <h2>Add listing</h2>
      <p>Save the listing title, its source link, and the date it went live.</p>

      <label htmlFor="listing-title">LISTING TITLE</label>
      <input id="listing-title" autoFocus className="modal-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Stainless steel water bottle" required />

      <label htmlFor="listing-source-link">SOURCE LINK</label>
      <input id="listing-source-link" type="url" className="modal-input" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." required />

      <label htmlFor="listing-date">LISTED DATE</label>
      <input id="listing-date" type="date" className="modal-input" value={listedDate} onChange={(e) => setListedDate(e.target.value)} required />

      <div className="modal-note">
        <ClipboardList size={15} /> The source badge is detected from the link’s address.
      </div>
      <button className="button primary modal-submit" type="submit">
        <Plus size={16} /> Add listing
      </button>
    </form>
  );
}
