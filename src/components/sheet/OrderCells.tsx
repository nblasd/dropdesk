import { money } from "@/lib/format";
import { orderEarnings, orderNetProfit } from "@/lib/orders";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { RowMenu } from "@/components/ui/RowMenu";
import { Source } from "@/components/ui/Source";
import { Status } from "@/components/ui/Status";
import type { RowHandlers } from "./types";

export function OrderHeader() {
  return (
    <>
      <th>EBAY ORDER ID</th>
      <th>ITEM</th>
      <th>ALIEXPRESS ID</th>
      <th>TRACKING</th>
      <th>QTY</th>
      <th>SUB TOTAL</th>
      <th>TRANS. FEE</th>
      <th>AD FEES</th>
      <th>POSTAGE</th>
      <th>EARNINGS</th>
      <th>COST OF GOODS</th>
      <th>NET PROFIT</th>
      <th>DISCOUNT</th>
      <th>RETURN FEE</th>
      <th>RETURN TRACKING</th>
      <th>EBAY RETURN FEE</th>
      <th>STATUS</th>
      <th>ORDER DATE</th>
      <th />
    </>
  );
}

export function OrderCells({ row, handlers }: { row: Record<string, any>; handlers: RowHandlers }) {
  const { onUpdateCell, onEditRow, onDeleteRow } = handlers;

  return (
    <>
      <td>
        <span className="order-id">{row.id}</span>
      </td>
      <td>
        <input readOnly className="cell-input item-input" value={row.item} onChange={(e) => onUpdateCell(row, "item", e.target.value)} />
      </td>
      <td>
        <div className="source-id">
          <Source source={row.source} />
          <input
            readOnly
            className="cell-input sourceid-input"
            value={row.sourceId}
            onChange={(e) => onUpdateCell(row, "sourceId", e.target.value)}
            placeholder="Add AliExpress ID"
          />
        </div>
      </td>
      <td>
        <input
          readOnly
          className="cell-input tracking-input"
          value={row.tracking ?? ""}
          onChange={(e) => onUpdateCell(row, "tracking", e.target.value)}
          placeholder="Add tracking"
        />
      </td>
      <td>
        <input
          readOnly
          className="cell-input qty-input"
          value={row.quantity ?? ""}
          onChange={(e) => onUpdateCell(row, "quantity", e.target.value)}
        />
      </td>
      <td>
        <MoneyInput value={row.sale} onChange={(value) => onUpdateCell(row, "sale", value)} />
      </td>
      <td>
        <MoneyInput value={row.fee} onChange={(value) => onUpdateCell(row, "fee", value)} />
      </td>
      <td>
        <MoneyInput value={row.adFees ?? 0} onChange={(value) => onUpdateCell(row, "adFees", value)} />
      </td>
      <td>
        <MoneyInput value={row.postage ?? 0} onChange={(value) => onUpdateCell(row, "postage", value)} />
      </td>
      <td className="green-money">{money(row.earnings ?? orderEarnings(row))}</td>
      <td>
        <MoneyInput value={row.cost} onChange={(value) => onUpdateCell(row, "cost", value)} />
      </td>
      <td className={orderNetProfit(row) >= 0 ? "green-money" : "negative-money"}>{money(orderNetProfit(row))}</td>
      <td>
        <MoneyInput value={row.discount ?? 0} onChange={(value) => onUpdateCell(row, "discount", value)} />
      </td>
      <td>
        <MoneyInput value={row.returnFee ?? 0} onChange={(value) => onUpdateCell(row, "returnFee", value)} />
      </td>
      <td>
        <input
          readOnly
          className="cell-input tracking-input"
          value={row.returnTracking ?? ""}
          onChange={(e) => onUpdateCell(row, "returnTracking", e.target.value)}
          placeholder="Add return tracking"
        />
      </td>
      <td>
        <MoneyInput value={row.ebayReturnFee ?? 0} onChange={(value) => onUpdateCell(row, "ebayReturnFee", value)} />
      </td>
      <td>
        <Status value={row.status} />
      </td>
      <td className="date-cell">{row.date}</td>
      <td>
        <RowMenu onEdit={() => onEditRow(row)} onDelete={() => onDeleteRow(row)} />
      </td>
    </>
  );
}
