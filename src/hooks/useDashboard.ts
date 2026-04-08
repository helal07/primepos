import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = today.slice(0, 8) + "01";

      const [salesRes, productsRes, lowStockRes, pendingRes, monthSalesRes, recentSalesRes, topProductsRes, activityRes] = await Promise.all([
        supabase.from("sales").select("total_amount").gte("sale_date", today),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).lt("stock_quantity", 5).gt("alert_quantity", 0),
        supabase.from("sales").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("sales").select("total_amount, sale_date").gte("sale_date", monthStart).order("sale_date"),
        supabase.from("sales").select("*, customers(name)").order("created_at", { ascending: false }).limit(5),
        supabase.from("sale_items").select("product_id, quantity, total, products(name)").order("total", { ascending: false }).limit(10),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(8),
      ]);

      const todaySales = (salesRes.data ?? []).reduce((s: number, r: any) => s + Number(r.total_amount), 0);
      const monthSales = (monthSalesRes.data ?? []).reduce((s: number, r: any) => s + Number(r.total_amount), 0);

      // Group month sales by date for chart
      const dailyMap: Record<string, number> = {};
      (monthSalesRes.data ?? []).forEach((r: any) => {
        const d = r.sale_date;
        dailyMap[d] = (dailyMap[d] || 0) + Number(r.total_amount);
      });
      const revenueChart = Object.entries(dailyMap).sort().map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString("en", { day: "2-digit", month: "short" }),
        revenue,
      }));

      // Group top products
      const productMap: Record<string, { name: string; sold: number; revenue: number }> = {};
      (topProductsRes.data ?? []).forEach((item: any) => {
        const pid = item.product_id;
        if (!productMap[pid]) productMap[pid] = { name: item.products?.name || "Unknown", sold: 0, revenue: 0 };
        productMap[pid].sold += Number(item.quantity);
        productMap[pid].revenue += Number(item.total);
      });
      const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      return {
        todaySales,
        totalProducts: productsRes.count ?? 0,
        lowStock: lowStockRes.count ?? 0,
        pendingOrders: pendingRes.count ?? 0,
        monthRevenue: monthSales,
        revenueChart: revenueChart.length > 0 ? revenueChart : [
          { date: "No data", revenue: 0 },
        ],
        recentSales: recentSalesRes.data ?? [],
        topProducts,
        recentActivity: activityRes.data ?? [],
      };
    },
    refetchInterval: 30000,
  });
}
