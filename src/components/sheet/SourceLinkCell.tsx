import { ArrowUpRight } from "lucide-react";
import { isHttpUrl } from "@/lib/format";

export function SourceLinkCell({
  value,
  placeholder,
  ariaLabel,
  onChange,
}: {
  value?: string;
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="source-link-cell">
      <input readOnly className="cell-input source-url-input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {isHttpUrl(value ?? "") && (
        <a href={value} target="_blank" rel="noreferrer" aria-label={ariaLabel}>
          <ArrowUpRight size={13} />
        </a>
      )}
    </div>
  );
}
