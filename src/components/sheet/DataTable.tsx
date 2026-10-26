import type { CustomTable } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { CustomTableGrid } from "./CustomTableGrid";
import { RecordsTable } from "./RecordsTable";
import type { AttributionResolver, RowHandlers } from "./types";

export function DataTable({
  sheet,
  customTable,
  filtered,
  query,
  workspaceScope,
  handlers,
  attributionFor,
  onAddRow,
}: {
  sheet: string;
  customTable?: CustomTable;
  filtered: Record<string, any>[];
  query: string;
  workspaceScope: boolean;
  handlers: RowHandlers;
  attributionFor: AttributionResolver;
  onAddRow: () => void;
}) {
  const emptyTitle = query ? "No matching rows" : "A clean slate";
  const emptyText = query
    ? "Try another search or clear the filters."
    : `Add your first ${
        customTable ? "row" : sheet === "Product hunting" ? "product idea" : sheet === "Listings" ? "listing" : "order"
      } to start tracking.`;

  return (
    <div className="data-table-wrap">
      {customTable ? (
        <CustomTableGrid table={customTable} rows={filtered} handlers={handlers} />
      ) : (
        <RecordsTable sheet={sheet} rows={filtered} workspaceScope={workspaceScope} handlers={handlers} attributionFor={attributionFor} />
      )}
      {!filtered.length && <EmptyState title={emptyTitle} text={emptyText} onClick={onAddRow} />}
    </div>
  );
}
