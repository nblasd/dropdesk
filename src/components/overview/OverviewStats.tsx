import { ShoppingBag, Store, TrendingUp, Users } from "lucide-react";
import { money } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";

export function OverviewStats({
  clientsCount,
  ordersCount,
  orderProfit,
  listingsCount,
}: {
  clientsCount: number;
  ordersCount: number;
  orderProfit: number;
  listingsCount: number;
}) {
  return (
    <div className="stats-grid">
      <StatCard
        label="Active clients"
        value={String(clientsCount).padStart(2, "0")}
        change="All accounts"
        icon={<Users size={17} />}
        tone="mint"
      />
      <StatCard
        label="Orders this month"
        value={String(ordersCount).padStart(2, "0")}
        change="Across all clients"
        icon={<ShoppingBag size={17} />}
        tone="peach"
      />
      <StatCard
        label="Net profit"
        value={money(orderProfit)}
        change="After marketplace fees"
        icon={<TrendingUp size={17} />}
        tone="lavender"
      />
      <StatCard
        label="Active listings"
        value={String(listingsCount).padStart(2, "0")}
        change="Across all stores"
        icon={<Store size={17} />}
        tone="yellow"
      />
    </div>
  );
}
