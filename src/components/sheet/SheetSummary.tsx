import type { CustomTable, Sheet } from "@/lib/types";

export function SheetSummary({
  displaySheet,
  sheet,
  customTable,
  workspaceScope,
  sharedRowsReady,
  labelsReady,
  syncState,
  syncError,
  onRetrySync,
}: {
  displaySheet: string;
  sheet: Sheet;
  customTable?: CustomTable;
  workspaceScope: boolean;
  sharedRowsReady: boolean;
  labelsReady: boolean;
  syncState: "idle" | "saving" | "saved" | "error";
  syncError: string;
  onRetrySync: () => void;
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
      <span
        className={`last-saved${syncState === "error" ? " error" : ""}`}
        title={syncState === "error" ? `Cloud save failed: ${syncError}` : undefined}
      >
        <span />
        {syncState === "error" ? (
          <button type="button" className="last-saved-retry" onClick={onRetrySync}>
            Not saved to cloud — retry
          </button>
        ) : syncState === "saving" ? (
          "Saving…"
        ) : syncState === "saved" ? (
          "Saved to cloud"
        ) : (
          "Saved locally"
        )}
      </span>
    </div>
  );
}
