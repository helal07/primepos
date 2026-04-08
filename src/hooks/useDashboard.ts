import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const monthStart = today.slice(0, 8) + "01";

      // Previous month for comparison
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthStart = prevMonth.toISOString().slice(0, 10);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

      // Last 7 days
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().slice(0, 10);

      const [
        todaySalesRes,
        productsRes,
        lowStockRes,
        pendingOrdersRes,
        monthSalesRes,
        prevMonthSalesRes,
        recentSalesRes,
        topProductsRes,
        activityRes,
        stockAlertRes,
        unpaidSalesRes,
        unpaidPurchasesRes,
        totalPurchasesRes,
        weekSalesRes,
      ] = await Promise.all([
        supabase.from("sales").select("total_amount").gte("sale_date", today),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).lte("stock_quantity", 5),
        supabase.from("sales").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("sales").select("total_amount, sale_date").gte("sale_date", monthStart).order("sale_date"),
        supabase.from("sales").select("total_amount").gte("sale_date", prevMonthStart).lte("sale_date", prevMonthEnd),
        supabase.from("sales").select("*, customers(name)").order("created_at", { ascending: false }).limit(5),
        supabase.from("sale_items").select("product_id, quantity, total, products(name)").order("total", { ascending: false }).limit(50),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.from("products").select("id, name, stock_quantity, alert_quantity, selling_price").lte("stock_quantity", 10).order("stock_quantity", { ascending: true }).limit(10),
        supabase.from("sales").select("total_amount, invoice_number, customers(name)").eq("payment_status", "unpaid").order("created_at", { ascending: false }).limit(10),
        supabase.from("purchases").select("total_amount, reference_number, suppliers(name)").eq("payment_status", "unpaid").order("created_at", { ascending: false }).limit(10),
        supabase.from("purchases").select("total_amount").gte("purchase_date", monthStart),
        supabase.from("sales").select("total_amount, sale_date").gte("sale_date", weekAgoStr).order("sale_date"),
      ]);

      const todaySales = (todaySalesRes.data ?? []).reduce((s: number, r: any) => s + Number(r.total_amount), 0);
      const monthRevenue = (monthSalesRes.data ?? []).reduce((s: number, r: any) => s + Number(r.total_amount), 0);
      const prevMonthRevenue = (prevMonthSalesRes.data ?? []).reduce((s: number, r: any) => s + Number(r.total_amount), 0);
      const totalPurchases = (totalPurchasesRes.data ?? []).reduce((s: number, r: any) => s + Number(r.total_amount), 0);
      const profit = monthRevenue - totalPurchases;

      const saleDue = (unpaidSalesRes.data ?? []).reduce((s: number, r: any) => s + Number(r.total_amount), 0);
      const purchaseDue = (unpaidPurchasesRes.data ?? []).reduce((s: number, r: any) => s + Number(r.total_amount), 0);

      // Revenue growth %
      const revenueGrowth = prevMonthRevenue > 0 ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

      // Daily revenue chart (this month)
      const dailyMap: Record<string, number> = {};
      (monthSalesRes.data ?? []).forEach((r: any) => {
        const d = typeof r.sale_date === "string" ? r.sale_date.slice(0, 10) : r.sale_date;
        dailyMap[d] = (dailyMap[d] || 0) + Number(r.total_amount);
      });
      const revenueChart = Object.entries(dailyMap).sort().map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString("en", { day: "2-digit", month: "short" }),
        revenue,
      }));

      // Weekly daily chart
      const weekDailyMap: Record<string, number> = {};
      (weekSalesRes.data ?? []).forEach((r: any) => {
        const d = typeof r.sale_date === "string" ? r.sale_date.slice(0, 10) : r.sale_date;
        weekDailyMap[d] = (weekDailyMap[d] || 0) + Number(r.total_amount);
      });
      const weekChart = Object.entries(weekDailyMap).sort().map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString("en", { weekday: "short" }),
        revenue,
      }));

      // Top products aggregated
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
        pendingOrders: pendingOrdersRes.count ?? 0,
        monthRevenue,
        prevMonthRevenue,
        revenueGrowth,
        totalPurchases,
        profit,
        saleDue,
        purchaseDue,
        revenueChart: revenueChart.length > 0 ? revenueChart : [{ date: "No data", revenue: 0 }],
        weekChart: weekChart.length > 0 ? weekChart : [{ date: "No data", revenue: 0 }],
        recentSales: recentSalesRes.data ?? [],
        topProducts,
        recentActivity: activityRes.data ?? [],
        stockAlerts: stockAlertRes.data ?? [],
        unpaidSales: unpaidSalesRes.data ?? [],
        unpaidPurchases: unpaidPurchasesRes.data ?? [],
      };
    },
    refetchInterval: 30000,
  });
}
