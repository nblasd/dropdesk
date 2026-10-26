import { FileSpreadsheet } from "lucide-react";

export function ImportTableModal({
  name,
  setName,
  file,
  setFile,
  busy,
  onImport,
  onClose,
}: {
  name: string;
  setName: (value: string) => void;
  file: File | null;
  setFile: (value: File | null) => void;
  busy: boolean;
  onImport: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <span className="modal-icon mint">
        <FileSpreadsheet size={19} />
      </span>
      <h2>Import a CSV</h2>
      <p>We’ll use the first row as column names and create a new table for this client.</p>

      <label htmlFor="import-table-name">TABLE NAME</label>
      <input id="import-table-name" className="modal-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Product research" />

      <div className="import-help">In Google Sheets, choose File → Download → Comma-separated values (.csv).</div>

      <label className="csv-picker">
        <FileSpreadsheet size={16} />
        <span>{file ? file.name : "Choose a .csv file"}</span>
        <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>

      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="button primary" onClick={onImport} disabled={busy || !file}>
          {busy ? "Importing…" : "Import and create table"}
        </button>
      </div>
    </>
  );
}
