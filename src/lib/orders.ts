import { todayIso } from "./format";

// Order money math mirrors the operations spreadsheet: order earning defaults to
// the sub total minus fees, but can be overridden with the actual payout amount.
// Net profit is the order earning minus cost of goods.
export const orderEarnings = (order: Record<string, any>) =>
  +((Number(order.sale) || 0) - (Number(order.fee) || 0) - (Number(order.adFees) || 0)).toFixed(2);

export const orderEarningsValue = (order: Record<string, any>) =>
  order.earnings !== undefined && order.earnings !== null && order.earnings !== ""
    ? Number(order.earnings) || 0
    : orderEarnings(order);

// True when the stored earning still matches the auto-calculated amount, so fee
// changes can safely refresh it. A hand-entered earning is left untouched.
export const isOrderEarningsAuto = (order: Record<string, any>) =>
  order.earnings === undefined ||
  order.earnings === null ||
  order.earnings === "" ||
  Math.abs(Number(order.earnings) - orderEarnings(order)) < 0.005;

export const orderNetProfit = (order: Record<string, any>) =>
  +(orderEarningsValue(order) - (Number(order.cost) || 0)).toFixed(2);

// Older rows stored columns the order table no longer shows. Drop them, and
// refresh earnings that were still auto-derived so stored profit stays correct.
const retiredOrderKeys = ["postage", "tracking", "discount", "returnFee", "returnTracking", "ebayReturnFee"];

export const normalizeOrderRow = (row: Record<string, any>) => {
  if (!retiredOrderKeys.some((key) => key in row)) return row;
  const next = { ...row };
  retiredOrderKeys.forEach((key) => delete next[key]);
  const legacyAuto = +(orderEarnings(row) - (Number(row.postage) || 0)).toFixed(2);
  const earnings = Math.abs(Number(row.earnings) - legacyAuto) < 0.005 ? orderEarnings(next) : orderEarningsValue(next);
  return { ...next, earnings, profit: +(earnings - (Number(next.cost) || 0)).toFixed(2) };
};

export const orderDraftTemplate = (): Record<string, string> => ({
  date: todayIso(),
  orderId: "",
  item: "",
  quantity: "1",
  sourceId: "",
  subtotal: "",
  transFee: "",
  adFees: "",
  earnings: "",
  cost: "",
});
