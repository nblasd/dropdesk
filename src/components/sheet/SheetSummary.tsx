import type { CustomTable, Sheet } from "@/lib/types";

export function SheetSummary({
  displaySheet,
  sheet,
  customTable,
  workspaceScope,
  sharedRowsReady,
  labelsReady,
}: {
  displaySheet: string;
  sheet: Sheet;
  customTable?: CustomTable;
  workspaceScope: boolean;
  sharedRowsReady: boolean;
  labelsReady: boolean;
}) {
  return (
    <div className="sheet-summary">
      <div>
        <h2>{displaySheet}</h2>
        <p>
          {customTable ? (
            `${customTable.columns.length} columns imported from your spreadsheet.`
          ) : sheet === "Product hunting" ? (
            <>
              Find products worth listing. Add source costs, target price, and links.
              {workspaceScope && !sharedRowsReady && (
                <b className="inline-warning"> Rows here will not save until migration 20261025 is applied in Supabase.</b>
              )}
              {workspaceScope && !labelsReady && (
                <b className="inline-warning"> Apply migration 20261028 to show who added each product.</b>
              )}
            </>
          ) : sheet === "Listings" ? (
            "Keep every listing’s title, source link, and listed date in one place."
          ) : (
            "Track fulfillment and see your profit per sale."
          )}
        </p>
      </div>
      <span className="last-saved">
        <span /> Saved locally
      </span>
    </div>
  );
}
