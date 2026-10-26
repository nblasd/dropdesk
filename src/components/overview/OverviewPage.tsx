import { ChevronDown } from "lucide-react";
import type { BuiltInTable, Client, CustomTable, WorkspaceData } from "@/lib/types";
import { ActivityPanel } from "./ActivityPanel";
import { ClientSetup } from "./ClientSetup";
import { ClientsPanel } from "./ClientsPanel";
import { OverviewStats } from "./OverviewStats";
import { WelcomeCard } from "./WelcomeCard";

type OverviewPageProps = {
  current?: Client;
  workspaceScope: boolean;
  visibleClients: Client[];
  visibleData: WorkspaceData;
  clientsCount: number;
  activeCustomTables: CustomTable[];
  allOrdersCount: number;
  orderProfit: number;
  listingsCount: number;
  onOpenTable: (id: string) => void;
  onChooseTable: (table: BuiltInTable) => void;
  onImport: () => void;
  onAddClient: () => void;
  onOpenClient: (id: string) => void;
  onOpenOrders: () => void;
  onShowToast: (message: string) => void;
};

export function OverviewPage({
  current,
  workspaceScope,
  visibleClients,
  visibleData,
  clientsCount,
  activeCustomTables,
  allOrdersCount,
  orderProfit,
  listingsCount,
  onOpenTable,
  onChooseTable,
  onImport,
  onAddClient,
  onOpenClient,
  onOpenOrders,
  onShowToast,
}: OverviewPageProps) {
  const clientIsEmpty = current && !workspaceScope && !Object.values(visibleData[current.id] ?? {}).some((rows) => rows.length);

  return (
    <>
      {clientIsEmpty && current ? (
        <ClientSetup
          clientName={current.name}
          customTables={activeCustomTables}
          onOpenTable={onOpenTable}
          onChoose={onChooseTable}
          onImport={onImport}
        />
      ) : (
        <WelcomeCard hasClients={visibleClients.length > 0} onOpenOrders={onOpenOrders} onAddClient={onAddClient} />
      )}

      <div className="section-title-row">
        <div>
          <h2>Overview</h2>
          <p>A snapshot of your operation across all clients.</p>
        </div>
        <button className="period-select" onClick={() => onShowToast("Showing this month")}>
          <span className="period-dot" /> This month <ChevronDown size={14} />
        </button>
      </div>

      <OverviewStats
        clientsCount={visibleClients.length}
        ordersCount={allOrdersCount}
        orderProfit={orderProfit}
        listingsCount={listingsCount}
      />

      <div className="dashboard-grid">
        <ClientsPanel visibleClients={visibleClients} visibleData={visibleData} onOpenClient={onOpenClient} onAddClient={onAddClient} />
        <ActivityPanel hasClients={clientsCount > 0} onOpenOrders={onOpenOrders} onShowToast={onShowToast} />
      </div>
    </>
  );
}
