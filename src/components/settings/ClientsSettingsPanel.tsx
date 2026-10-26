import { Plus, Store } from "lucide-react";
import type { Client, CustomTable, WorkspaceData } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";

export function ClientsSettingsPanel({
  clients,
  data,
  customTables,
  onOpen,
  onEdit,
  onDelete,
  onAdd,
}: {
  clients: Client[];
  data: WorkspaceData;
  customTables: Record<string, CustomTable[]>;
  onOpen: (id: string) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onAdd: () => void;
}) {
  const importedTables = (client: Client) => customTables[client.id] ?? [];
  const rowCount = (client: Client) =>
    Object.values(data[client.id] ?? {}).reduce((total, rows) => total + (rows as unknown[]).length, 0) +
    importedTables(client).reduce((total, table) => total + table.rows.length, 0);

  return (
    <section className="panel settings-panel">
      <div className="panel-heading">
        <div>
          <h3>Your clients</h3>
          <p>
            {clients.length
              ? `${clients.length} client workspace${clients.length === 1 ? "" : "s"} in this account.`
              : "No clients yet."}
          </p>
        </div>
        <button className="text-button" onClick={onAdd}>
          Add client <Plus size={14} />
        </button>
      </div>

      {clients.length ? (
        <div className="client-table-wrap">
          <table className="client-table settings-table">
            <thead>
              <tr>
                <th>CLIENT</th>
                <th>STORE</th>
                <th>ROWS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <span className="table-client">
                      <span className="client-avatar" style={{ background: client.color }}>
                        {client.initials}
                      </span>
                      <span>
                        <b>{client.name}</b>
                        <small>{importedTables(client).length + 3} tables</small>
                      </span>
                    </span>
                  </td>
                  <td className="store-cell">
                    <span className="store-icon">
                      <Store size={14} />
                    </span>
                    {client.store}
                  </td>
                  <td>{rowCount(client)}</td>
                  <td>
                    <div className="settings-actions">
                      <button className="text-button" onClick={() => onOpen(client.id)}>
                        Open
                      </button>
                      <button className="text-button" onClick={() => onEdit(client)}>
                        Edit
                      </button>
                      <button className="text-button danger" onClick={() => onDelete(client)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No clients yet"
          text="Create your first client workspace to get started."
          actionLabel="Add a client"
          onClick={onAdd}
        />
      )}
    </section>
  );
}
