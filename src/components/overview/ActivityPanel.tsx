import { ArrowUpRight, FileSpreadsheet, MoreHorizontal } from "lucide-react";

export function ActivityPanel({
  hasClients,
  onOpenOrders,
  onShowToast,
}: {
  hasClients: boolean;
  onOpenOrders: () => void;
  onShowToast: (message: string) => void;
}) {
  return (
    <section className="panel activity-panel">
      <div className="panel-heading">
        <div>
          <h3>Recent activity</h3>
          <p>Latest across your accounts.</p>
        </div>
        <button className="more-round" onClick={() => onShowToast("Activity history coming soon")}>
          <MoreHorizontal size={17} />
        </button>
      </div>

      <div className="activity-list">
        <div className="empty-state">
          <span className="empty-icon">
            <FileSpreadsheet size={18} />
          </span>
          <b>No activity yet</b>
          <p>Your updates will appear here after you add clients and orders.</p>
        </div>
      </div>

      {hasClients && (
        <button className="activity-footer" onClick={onOpenOrders}>
          See all activity <ArrowUpRight size={14} />
        </button>
      )}
    </section>
  );
}
