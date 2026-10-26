import { money } from "@/lib/format";

export type OrderTotalsValue = {
  count: number;
  quantity: number;
  sales: number;
  fees: number;
  earnings: number;
  investment: number;
  profit: number;
};

export function OrderTotals({ totals }: { totals: OrderTotalsValue }) {
  const cells: [string, string][] = [
    ["ORDERS", String(totals.count)],
    ["QUANTITY", String(totals.quantity)],
    ["TOTAL SALES", money(totals.sales)],
    ["ORDER FEES", money(totals.fees)],
    ["ORDER EARNINGS", money(totals.earnings)],
    ["TOTAL INVESTMENT", money(totals.investment)],
    ["TOTAL PROFIT", money(totals.profit)],
  ];

  return (
    <div className="order-totals">
      {cells.map(([label, value]) => (
        <span key={label} className={`order-total${label === "TOTAL PROFIT" ? (totals.profit >= 0 ? " profit" : " loss") : ""}`}>
          <small>{label}</small>
          <b>{value}</b>
        </span>
      ))}
    </div>
  );
}
