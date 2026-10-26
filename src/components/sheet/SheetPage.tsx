import type { Client, CustomTable, Sheet } from "@/lib/types";
import { ClientContextBar } from "./ClientContextBar";
import { DataTable } from "./DataTable";
import { OrderTotals, type OrderTotalsValue } from "./OrderTotals";
import { SheetSummary } from "./SheetSummary";
import { SheetTabs } from "./SheetTabs";
import { TableFooter } from "./TableFooter";
import { TableToolbar } from "./TableToolbar";
import type { AttributionResolver, RowHandlers } from "./types";

type SheetPageProps = {
  current?: Client;
  workspaceScope: boolean;
  sheet: Sheet;
  activeCustomTables: CustomTable[];
  customTable?: CustomTable;
  items?: Record<string, any[]>;
  displaySheet: string;
  rows: Record<string, any>[];
  filtered: Record<string, any>[];
  selectedRows: string[];
  allVisibleSelected: boolean;
  sourceFilter: string;
  ordersTotals: OrderTotalsValue | null;
  sharedRowsReady: boolean;
  labelsReady: boolean;
  query: string;
  handlers: RowHandlers;
  attributionFor: AttributionResolver;
  onSelectSheet: (tab: Sheet) => void;
  onImport: () => void;
  onOpenSettings: () => void;
  onSourceFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onDeleteSelected: () => void;
  onExport: () => void;
  onAddRow: () => void;
  onShowToast: (message: string) => void;
};

export function SheetPage({
  current,
  workspaceScope,
  sheet,
  activeCustomTables,
  customTable,
  items,
  displaySheet,
  rows,
  filtered,
  selectedRows,
  allVisibleSelected,
  sourceFilter,
  ordersTotals,
  sharedRowsReady,
  labelsReady,
  query,
  handlers,
  attributionFor,
  onSelectSheet,
  onImport,
  onOpenSettings,
  onSourceFilterChange,
  onClearFilters,
  onDeleteSelected,
  onExport,
  onAddRow,
  onShowToast,
}: SheetPageProps) {
  return (
    <>
      <ClientContextBar current={current} onOpenSettings={onOpenSettings} />
      <SheetTabs
        sheet={sheet}
        workspaceScope={workspaceScope}
        activeCustomTables={activeCustomTables}
        items={items}
        onSelect={onSelectSheet}
        onImport={onImport}
      />
      <SheetSummary
        displaySheet={displaySheet}
        sheet={sheet}
        customTable={customTable}
        workspaceScope={workspaceScope}
        sharedRowsReady={sharedRowsReady}
        labelsReady={labelsReady}
      />
      <TableToolbar
        sheet={sheet}
        customTable={customTable}
        filteredCount={filtered.length}
        selectedCount={selectedRows.length}
        sourceFilter={sourceFilter}
        onSourceFilterChange={onSourceFilterChange}
        onDeleteSelected={onDeleteSelected}
        onExport={onExport}
        onAddRow={onAddRow}
        onClearFilters={onClearFilters}
        onShowToast={onShowToast}
      />
      {ordersTotals && <OrderTotals totals={ordersTotals} />}
      <DataTable
        sheet={sheet}
        customTable={customTable}
        filtered={filtered}
        query={query}
        workspaceScope={workspaceScope}
        handlers={{ ...handlers, allSelected: allVisibleSelected, selectedRows }}
        attributionFor={attributionFor}
        onAddRow={onAddRow}
      />
      <TableFooter filteredCount={filtered.length} totalCount={rows.length} />
    </>
  );
}
