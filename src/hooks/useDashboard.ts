import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { useTenantRealtime } from "@/hooks/useTenantRealtime";

export interface DashboardStats {
  todaySales: number;
  totalProducts: number;
  lowStock: number;
  pendingOrders: number;
  monthRevenue: number;
  prevMonthRevenue: number;
  revenueGrowth: number;
  totalPurchases: number;
  profit: number;
  saleDue: number;
  purchaseDue: number;
  revenueChart: { date: string; revenue: number }[];
  weekChart: { date: string; revenue: number }[];
  recentSales: any[];
  topProducts: { name: string; sold: number; revenue: number }[];
  recentActivity: any[];
  stockAlerts: any[];
  unpaidSales: any[];
  unpaidPurchases: any[];
}

/**
 * Single-call dashboard aggregates from /api/dashboard/stats.
 * Replaces the previous 14 chained Supabase queries.
 */
export function useDashboardStats() {
  // Real-time refresh: dashboard auto-refetches when a sale or purchase
  // happens anywhere in the tenant. Polling drops to 2 minutes as a
  // safety net for offline / blocked-websocket cases.
  useTenantRealtime(["sales", "purchases"], [["dashboard_stats"]]);

  return useQuery({
    queryKey: ["dashboard_stats"],
    refetchInterval: 120_000,
    queryFn: async () => {
      const res = await api.get<DashboardStats>("/api/dashboard/stats");

      // Pretty-format date labels client-side (server returns ISO dates).
      const fmtMonth = (d: string) =>
        new Date(d).toLocaleDateString("en", { day: "2-digit", month: "short" });
      const fmtWeek = (d: string) =>
        new Date(d).toLocaleDateString("en", { weekday: "short" });

      return {
        ...res,
        revenueChart: res.revenueChart.length
          ? res.revenueChart.map((r) => ({ date: fmtMonth(r.date), revenue: r.revenue }))
          : [{ date: "No data", revenue: 0 }],
        weekChart: res.weekChart.length
          ? res.weekChart.map((r) => ({ date: fmtWeek(r.date), revenue: r.revenue }))
          : [{ date: "No data", revenue: 0 }],
      } as DashboardStats;
    },
  });
}
