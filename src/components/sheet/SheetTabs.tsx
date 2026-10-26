import { ClipboardList, FileSpreadsheet, LayoutDashboard, Package, Plus, ShoppingBag } from "lucide-react";
import { tabs } from "@/lib/constants";
import type { CustomTable, Sheet } from "@/lib/types";

export function SheetTabs({
  sheet,
  workspaceScope,
  activeCustomTables,
  items,
  onSelect,
  onImport,
}: {
  sheet: Sheet;
  workspaceScope: boolean;
  activeCustomTables: CustomTable[];
  items?: Record<string, any[]>;
  onSelect: (tab: Sheet) => void;
  onImport: () => void;
}) {
  const visibleTabs: Sheet[] = [...(workspaceScope ? (["Product hunting"] as Sheet[]) : tabs), ...activeCustomTables.map((table) => table.id)];

  return (
    <div className="sheet-tabs">
      {visibleTabs.map((tab) => {
        const custom = activeCustomTables.find((table) => table.id === tab);
        return (
          <button key={tab} className={sheet === tab ? "tab-active" : ""} onClick={() => onSelect(tab)}>
            {custom ? (
              <FileSpreadsheet size={15} />
            ) : tab === "Product hunting" ? (
              <Package size={15} />
            ) : tab === "Listings" ? (
              <ClipboardList size={15} />
            ) : tab === "Orders" ? (
              <ShoppingBag size={15} />
            ) : (
              <LayoutDashboard size={15} />
            )}{" "}
            {custom?.name ?? tab}
            {tab !== "Overview" && <span className="tab-count">{custom ? custom.rows.length : (items?.[tab]?.length ?? 0)}</span>}
          </button>
        );
      })}
      <button className="add-table-tab" onClick={onImport}>
        <Plus size={14} /> Import CSV
      </button>
    </div>
  );
}
