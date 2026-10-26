import { ArrowUpRight, Plus, Store } from "lucide-react";
import { money } from "@/lib/format";
import type { Client, WorkspaceData } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";

export function ClientsPanel({
  visibleClients,
  visibleData,
  onOpenClient,
  onAddClient,
}: {
  visibleClients: Client[];
  visibleData: WorkspaceData;
  onOpenClient: (id: string) => void;
  onAddClient: () => void;
}) {
  return (
    <section className="panel clients-panel">
      <div className="panel-heading">
        <div>
          <h3>Your clients</h3>
          <p>Open a client workspace.</p>
        </div>
        <button className="text-button" onClick={onAddClient}>
          Add client <Plus size={14} />
        </button>
      </div>

      <div className="client-table-wrap">
        {visibleClients.length ? (
          <table className="client-table">
            <thead>
              <tr>
                <th>CLIENT</th>
                <th>STORE</th>
                <th>ORDERS</th>
                <th>NET PROFIT</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleClients.slice(0, 4).map((client) => {
                const clientData = visibleData[client.id];
                const orders = clientData?.Orders?.length ?? 0;
                const profit = clientData?.Orders?.reduce((a: any, o: any) => a + o.profit, 0) ?? 0;
                return (
                  <tr key={client.id} onClick={() => onOpenClient(client.id)}>
                    <td>
                      <span className="table-client">
                        <span className="client-avatar" style={{ background: client.color }}>
                          {client.initials}
                        </span>
                        <span>
                          <b>{client.name}</b>
                          <small>Open workspace</small>
                        </span>
                      </span>
                    </td>
                    <td className="store-cell">
                      <span className="store-icon">
                        <Store size={14} />
                      </span>
                      {client.store}
                    </td>
                    <td>{orders || "—"}</td>
                    <td className="profit-cell">{profit ? money(profit) : "—"}</td>
                    <td>
                      <button
                        className="row-more"
                        aria-label="Open client workspace"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenClient(client.id);
                        }}
                      >
                        <ArrowUpRight size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No clients yet"
            text="Create your first client workspace to get started."
            actionLabel="Add a client"
            onClick={onAddClient}
          />
        )}
      </div>

      <button className="add-client-row" onClick={onAddClient}>
        <Plus size={15} /> Add another client
      </button>
    </section>
  );
}
