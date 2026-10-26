import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  change,
  icon,
  tone,
}: {
  label: string;
  value: string;
  change: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-change">
        {change.startsWith("↑") && <span className="up-arrow">↗</span>}
        {change}
      </div>
    </div>
  );
}
