export function MoneyInput({ value, onChange }: { value: number; onChange: (v: string) => void }) {
  return (
    <span className="money-input-wrap">
      <span>$</span>
      <input
        readOnly
        className="cell-input money-input"
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  );
}
