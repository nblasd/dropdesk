import { money } from "@/lib/format";
import { orderEarningsValue, orderNetProfit } from "@/lib/orders";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { RowMenu } from "@/components/ui/RowMenu";
import { Source } from "@/components/ui/Source";
import { StatusSelect } from "@/components/ui/Status";
import type { RowHandlers } from "./types";

export function OrderHeader() {
  return (
    <>
      <th>EBAY ORDER ID</th>
      <th>ITEM</th>
      <th>ALIEXPRESS ID</th>
      <th>QTY</th>
      <th>SUB TOTAL</th>
      <th>TRANS. FEE</th>
      <th>AD FEES</th>
      <th>ORDER EARNING</th>
      <th>COST OF GOODS</th>
      <th>NET PROFIT</th>
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
        <MoneyInput value={orderEarningsValue(row)} onChange={(value) => onUpdateCell(row, "earnings", value)} />
      </td>
      <td>
        <MoneyInput value={row.cost} onChange={(value) => onUpdateCell(row, "cost", value)} />
      </td>
      <td className={orderNetProfit(row) >= 0 ? "green-money" : "negative-money"}>{money(orderNetProfit(row))}</td>
      <td>
        <StatusSelect value={row.status} onChange={(value) => onUpdateCell(row, "status", value)} />
      </td>
      <td className="date-cell">{row.date}</td>
      <td>
        <RowMenu onEdit={() => onEditRow(row)} onDelete={() => onDeleteRow(row)} />
      </td>
    </>
  );
}
