import { Plus, ShoppingBag, TrendingUp } from "lucide-react";

function OrderField({
  id,
  label,
  type = "text",
  placeholder = "",
  step,
  min,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  step?: string;
  min?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="row-edit-field" htmlFor={`order-${id}`}>
      <span>{label}</span>
      <input
        id={`order-${id}`}
        type={type}
        step={step}
        min={min}
        className="modal-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={id === "item" || id === "date"}
      />
    </label>
  );
}

export function OrderModal({
  draft,
  setDraft,
  onAdd,
}: {
  draft: Record<string, string>;
  setDraft: (value: Record<string, string>) => void;
  onAdd: () => void;
}) {
  const bind = (id: string) => ({
    id,
    value: draft[id] ?? "",
    onChange: (value: string) => setDraft({ ...draft, [id]: value }),
  });

  return (
    <form
      className="row-edit-form order-edit-form"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd();
      }}
    >
      <span className="modal-icon lilac">
        <ShoppingBag size={19} />
      </span>
      <h2>Add order</h2>
      <p>Enter the order as it appears in your operations sheet. Order earnings and net profit calculate automatically.</p>

      <div className="row-edit-fields">
        <OrderField {...bind("date")} label="ORDER DATE" type="date" />
        <OrderField {...bind("orderId")} label="EBAY ORDER ID" placeholder="e.g. 05-12345-67890" />
        <OrderField {...bind("item")} label="ITEM NAME" placeholder="e.g. Stainless steel water bottle" />
        <OrderField {...bind("quantity")} label="QUANTITY" type="number" placeholder="1" step="1" min="1" />
        <OrderField {...bind("sourceId")} label="ALIEXPRESS ID" placeholder="821430..." />
        <OrderField {...bind("tracking")} label="TRACKING" placeholder="Tracking / carrier" />
      </div>

      <div className="row-edit-fields">
        <OrderField {...bind("subtotal")} label="SUB TOTAL" type="number" placeholder="0.00" step="0.01" min="0" />
        <OrderField {...bind("transFee")} label="TRANS. FEE" type="number" placeholder="0.00" step="0.01" min="0" />
        <OrderField {...bind("adFees")} label="AD FEES" type="number" placeholder="0.00" step="0.01" min="0" />
        <OrderField {...bind("postage")} label="POSTAGE" type="number" placeholder="0.00" step="0.01" min="0" />
        <OrderField {...bind("cost")} label="COST OF GOODS" type="number" placeholder="0.00" step="0.01" min="0" />
      </div>

      <div className="modal-note">
        <TrendingUp size={15} /> Earnings = sub total minus fees. Net profit = earnings minus cost of goods.
      </div>
      <button className="button primary modal-submit" type="submit">
        <Plus size={16} /> Add order
      </button>
    </form>
  );
}
