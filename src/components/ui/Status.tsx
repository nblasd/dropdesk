import { statusClass } from "@/lib/format";

export function Status({ value }: { value: string }) {
  return (
    <span className={`status ${statusClass(value)}`}>
      <i />
      {value}
    </span>
  );
}
