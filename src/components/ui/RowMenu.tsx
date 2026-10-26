"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, X } from "lucide-react";

export function RowMenu({ onEdit, onDelete }: { onEdit?: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="row-menu-wrap">
      <button className="row-more" aria-label="Row options" onClick={() => setOpen(!open)}>
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <div className="row-menu">
          {onEdit && (
            <button
              onClick={() => {
                onEdit();
                setOpen(false);
              }}
            >
              <Pencil size={14} /> Edit row
            </button>
          )}
          <button
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            <X size={14} /> Delete row
          </button>
        </div>
      )}
    </div>
  );
}
