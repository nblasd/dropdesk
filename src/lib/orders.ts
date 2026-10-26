import { todayIso } from "./format";

// Order money math mirrors the operations spreadsheet: earnings are the sub
// total minus every fee column, and net profit is earnings minus cost of goods.
export const orderEarnings = (order: Record<string, any>) =>
  +(
    (Number(order.sale) || 0) -
    (Number(order.fee) || 0) -
    (Number(order.adFees) || 0) -
    (Number(order.postage) || 0)
  ).toFixed(2);

export const orderNetProfit = (order: Record<string, any>) =>
  +(
    (order.earnings !== undefined && order.earnings !== null ? Number(order.earnings) : orderEarnings(order)) -
    (Number(order.cost) || 0)
  ).toFixed(2);

export const orderDraftTemplate = (): Record<string, string> => ({
  date: todayIso(),
  orderId: "",
  item: "",
  quantity: "1",
  sourceId: "",
  tracking: "",
  subtotal: "",
  transFee: "",
  adFees: "",
  postage: "",
  cost: "",
});
