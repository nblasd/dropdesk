import { statusClass } from "@/lib/format";
import { ORDER_STATUSES } from "@/lib/constants";

export function Status({ value }: { value: string }) {
  return (
    <span className={`status ${statusClass(value)}`}>
      <i />
      {value}
    </span>
  );
}

export function StatusSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const current = value || "Processing";

  return (
    <span className={`status status-select ${statusClass(current)}`}>
      <i />
      <select value={current} onChange={(event) => onChange(event.target.value)} aria-label="Order status">
        {ORDER_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </span>
  );
}
