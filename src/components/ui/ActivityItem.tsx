import type { ReactNode } from "react";

export function ActivityItem({
  icon,
  tone,
  title,
  detail,
  time,
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  detail: string;
  time: string;
}) {
  return (
    <div className="activity-item">
      <span className={`activity-icon ${tone}`}>{icon}</span>
      <div className="activity-copy">
        <b>{title}</b>
        <span>{detail}</span>
      </div>
      <time>{time}</time>
    </div>
  );
}
