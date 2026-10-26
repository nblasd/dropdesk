import { ArrowDownToLine, ChevronDown, Filter, Plus, Settings2, X } from "lucide-react";
import type { CustomTable, Sheet } from "@/lib/types";

export function TableToolbar({
  sheet,
  customTable,
  filteredCount,
  selectedCount,
  sourceFilter,
  onSourceFilterChange,
  onDeleteSelected,
  onExport,
  onAddRow,
  onClearFilters,
  onShowToast,
}: {
  sheet: Sheet;
  customTable?: CustomTable;
  filteredCount: number;
  selectedCount: number;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  onDeleteSelected: () => void;
  onExport: () => void;
  onAddRow: () => void;
  onClearFilters: () => void;
  onShowToast: (message: string) => void;
}) {
  return (
    <div className="table-toolbar">
      <div className="toolbar-left">
        <div className="filter-chip">
          <Filter size={14} />
          <select value={sourceFilter} onChange={(event) => onSourceFilterChange(event.target.value)}>
            <option>All sources</option>
            <option>AliExpress</option>
            <option>Amazon</option>
            <option>Alibaba</option>
          </select>
          <ChevronDown size={13} />
        </div>
        <button className="toolbar-filter" onClick={() => onShowToast("More filters coming soon")}>
          <Settings2 size={14} /> Filters
        </button>
        <button className="toolbar-filter" onClick={onClearFilters}>
          Clear
        </button>
      </div>

      <div className="toolbar-right">
        <span className="row-count">
          {filteredCount} {filteredCount === 1 ? "record" : "records"}
        </span>
        {selectedCount > 0 && (
          <button className="button danger compact" onClick={onDeleteSelected}>
            <X size={14} /> Delete {selectedCount} selected
          </button>
        )}
        <button className="button secondary compact" onClick={onExport}>
          <ArrowDownToLine size={14} /> Export CSV
        </button>
        <button className="button primary compact" onClick={onAddRow}>
          <Plus size={15} /> Add {customTable ? "row" : sheet === "Listings" ? "listing" : sheet === "Orders" ? "order" : "product"}
        </button>
      </div>
    </div>
  );
}
