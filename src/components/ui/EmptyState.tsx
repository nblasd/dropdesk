import { FileSpreadsheet, Plus } from "lucide-react";

export function EmptyState({
  title,
  text,
  onClick,
  actionLabel = "Add a row",
}: {
  title: string;
  text: string;
  onClick: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <FileSpreadsheet size={18} />
      </span>
      <b>{title}</b>
      <p>{text}</p>
      <button className="button secondary" onClick={onClick}>
        <Plus size={14} /> {actionLabel}
      </button>
    </div>
  );
}
