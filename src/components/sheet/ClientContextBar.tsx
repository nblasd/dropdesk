import { MoreHorizontal, Store } from "lucide-react";
import type { Client } from "@/lib/types";

export function ClientContextBar({ current, onOpenSettings }: { current?: Client; onOpenSettings: () => void }) {
  return (
    <div className="client-context">
      <span className="context-avatar" style={{ background: current?.color }}>
        {current?.initials}
      </span>
      <div>
        <b>{current?.name}</b>
        <span>
          <Store size={13} />
          {current?.store}
          <span className="context-sep">·</span>
          <span className="live-dot" /> Connected
        </span>
      </div>
      <button aria-label="Client settings" onClick={onOpenSettings}>
        <MoreHorizontal size={18} />
      </button>
    </div>
  );
}
