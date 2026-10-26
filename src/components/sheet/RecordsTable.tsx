import { ListingCells, ListingHeader } from "./ListingCells";
import { OrderCells, OrderHeader } from "./OrderCells";
import { ProductCells, ProductHeader } from "./ProductCells";
import type { AttributionResolver, RowHandlers } from "./types";

export function RecordsTable({
  sheet,
  rows,
  workspaceScope,
  handlers,
  attributionFor,
}: {
  sheet: string;
  rows: Record<string, any>[];
  workspaceScope: boolean;
  handlers: RowHandlers;
  attributionFor: AttributionResolver;
}) {
  const isProduct = sheet === "Product hunting";
  const isListing = sheet === "Listings";

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th className="select-col">
            <input type="checkbox" aria-label="Select all visible rows" checked={handlers.allSelected} onChange={handlers.onSelectAll} />
          </th>
          {isProduct ? <ProductHeader showAttribution={workspaceScope} /> : isListing ? <ListingHeader /> : <OrderHeader />}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="select-cell">
              <input
                type="checkbox"
                aria-label={`Select ${row.title ?? row.item ?? row.id}`}
                checked={handlers.selectedRows.includes(handlers.rowKey(row))}
                onChange={() => handlers.onToggleSelect(handlers.rowKey(row))}
              />
            </td>
            {isProduct ? (
              <ProductCells row={row} handlers={handlers} showAttribution={workspaceScope} attributionFor={attributionFor} />
            ) : isListing ? (
              <ListingCells row={row} handlers={handlers} />
            ) : (
              <OrderCells row={row} handlers={handlers} />
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
