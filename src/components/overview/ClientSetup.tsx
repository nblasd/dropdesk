import { ArrowUpRight, ClipboardList, FileSpreadsheet, Package, ShoppingBag, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BuiltInTable, CustomTable } from "@/lib/types";

const setupOptions: [BuiltInTable, string, string, LucideIcon][] = [
  ["Product hunting", "Product hunting", "Save supplier links, target prices, and product research.", Package],
  ["Listings", "Marketplace listings", "Organize listing titles, source links, and listed dates.", ClipboardList],
  ["Orders", "Orders & profit", "Track fulfillment costs, sale prices, and profit per order.", ShoppingBag],
];

export function ClientSetup({
  clientName,
  customTables,
  onOpenTable,
  onChoose,
  onImport,
}: {
  clientName: string;
  customTables: CustomTable[];
  onOpenTable: (id: string) => void;
  onChoose: (table: BuiltInTable) => void;
  onImport: () => void;
}) {
  return (
    <section className="client-setup">
      <div className="client-setup-intro">
        <span className="welcome-kicker">
          <Sparkles size={14} /> CLIENT WORKSPACE
        </span>
        <h2>Set up {clientName}’s workspace</h2>
        <p>Choose a table to get started, or import a CSV to create a table from its columns.</p>
      </div>

      {customTables.length > 0 && (
        <div className="setup-imported-tables">
          <b>Imported tables</b>
          {customTables.map((table) => (
            <button key={table.id} onClick={() => onOpenTable(table.id)}>
              <FileSpreadsheet size={15} />
              {table.name}
              <span>{table.rows.length} rows</span>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      )}

      <div className="client-setup-options">
        {setupOptions.map(([table, title, description, Icon]) => (
          <button key={table} className="client-setup-option" onClick={() => onChoose(table)}>
            <span className={`client-setup-icon ${table === "Product hunting" ? "sage" : table === "Listings" ? "peach" : "lilac"}`}>
              <Icon size={18} />
            </span>
            <span className="client-setup-copy">
              <b>{title}</b>
              <small>{description}</small>
            </span>
            <span className="client-setup-action">
              Open table <ArrowUpRight size={14} />
            </span>
          </button>
        ))}
      </div>

      <button className="button secondary setup-import" onClick={onImport}>
        <FileSpreadsheet size={15} /> Import CSV
      </button>
    </section>
  );
}
