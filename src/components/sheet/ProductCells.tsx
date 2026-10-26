import { Package } from "lucide-react";
import { money, shortDate } from "@/lib/format";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { RowMenu } from "@/components/ui/RowMenu";
import { Source } from "@/components/ui/Source";
import { Status } from "@/components/ui/Status";
import { SourceLinkCell } from "./SourceLinkCell";
import type { AttributionResolver, RowHandlers } from "./types";

export function ProductHeader({ showAttribution }: { showAttribution: boolean }) {
  return (
    <>
      <th>PRODUCT</th>
      <th>SOURCE</th>
      <th>SUPPLIER LINK</th>
      <th>EBAY LINK</th>
      <th>SUPPLIER COST</th>
      <th>EBAY PRICE</th>
      <th>EST. PROFIT</th>
      <th>MARGIN</th>
      <th>STATUS</th>
      <th>DATE ADDED</th>
      {showAttribution && <th title="The teammate who originally added this product">ADDED BY</th>}
      <th />
    </>
  );
}

export function ProductCells({
  row,
  handlers,
  showAttribution,
  attributionFor,
}: {
  row: Record<string, any>;
  handlers: RowHandlers;
  showAttribution: boolean;
  attributionFor: AttributionResolver;
}) {
  const { onUpdateCell, onEditRow, onDeleteRow } = handlers;

  return (
    <>
      <td>
        <div className="product-name">
          <span className="product-thumbnail">
            <Package size={16} />
          </span>
          <input readOnly className="cell-input title-input" value={row.title} onChange={(e) => onUpdateCell(row, "title", e.target.value)} />
        </div>
      </td>
      <td>
        <Source source={row.source} />
      </td>
      <td>
        <SourceLinkCell
          value={row.sourceUrl}
          placeholder="Paste source link"
          ariaLabel="Open source link"
          onChange={(value) => onUpdateCell(row, "sourceUrl", value)}
        />
      </td>
      <td>
        <SourceLinkCell
          value={row.ebayUrl}
          placeholder="Paste eBay link"
          ariaLabel="Open eBay link"
          onChange={(value) => onUpdateCell(row, "ebayUrl", value)}
        />
      </td>
      <td>
        <MoneyInput value={row.cost} onChange={(value) => onUpdateCell(row, "cost", value)} />
      </td>
      <td>
        <MoneyInput value={row.price} onChange={(value) => onUpdateCell(row, "price", value)} />
      </td>
      <td className="green-money">{money(row.profit)}</td>
      <td>
        <span className="margin-pill">{row.margin}%</span>
      </td>
      <td>
        <Status value={row.status} />
      </td>
      <td className="date-cell">{shortDate(row.date)}</td>
      {showAttribution && (
        <td className="added-by-cell">
          <AddedBy author={attributionFor(row.__createdBy)} />
        </td>
      )}
      <td>
        <RowMenu onEdit={() => onEditRow(row)} onDelete={() => onDeleteRow(row)} />
      </td>
    </>
  );
}

function AddedBy({ author }: { author: ReturnType<AttributionResolver> }) {
  return (
    <span className={`added-by${author.isYou ? " you" : ""}`} title={author.title}>
      <span className="added-by-avatar">{author.initials}</span>
      <span className="added-by-name">{author.name}</span>
    </span>
  );
}
