import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, Package, AlertTriangle, Clock, TrendingUp, ShoppingCart, Plus, MonitorSmartphone, Activity,
} from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboard";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();

  const summaryCards = [
    { title: "Today's Sales", value: `৳${(stats?.todaySales ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    { title: "Total Products", value: String(stats?.totalProducts ?? 0), icon: Package, color: "text-primary" },
    { title: "Low Stock", value: String(stats?.lowStock ?? 0), icon: AlertTriangle, color: "text-destructive" },
    { title: "Pending Orders", value: String(stats?.pendingOrders ?? 0), icon: Clock, color: "text-muted-foreground" },
    { title: "Revenue (MTD)", value: `৳${(stats?.monthRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your business performance" actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/sales/add")}><Plus className="h-4 w-4 mr-1" /> New Sale</Button>
          <Button size="sm" onClick={() => navigate("/pos")}><MonitorSmartphone className="h-4 w-4 mr-1" /> POS</Button>
        </div>
      } />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              {isLoading ? <Skeleton className="h-6 w-20 mt-1" /> : <p className="text-xl font-bold mt-1">{card.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Revenue Overview (This Month)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[280px] w-full" /> : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.revenueChart}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(201, 96%, 32%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(201, 96%, 32%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(215, 16%, 47%)" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(215, 16%, 47%)" }} />
                  <Tooltip formatter={(value: number) => [`৳${value.toLocaleString()}`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(201, 96%, 32%)" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Top Selling Products</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-40 w-full" /> : (stats?.topProducts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {(stats?.topProducts ?? []).map((product: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
                      <span className="truncate">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-muted-foreground">{product.sold} sold</span>
                      <span className="font-medium">৳{product.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Recent Sales</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-40 w-full" /> : (stats?.recentSales ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent sales</p>
            ) : (
              <div className="space-y-3">
                {(stats?.recentSales ?? []).map((sale: any) => (
                  <div key={sale.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{sale.customers?.name || "Walk-in"}</p>
                        <p className="text-xs text-muted-foreground">{sale.invoice_number}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium">৳{Number(sale.total_amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-40 w-full" /> : (stats?.recentActivity ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {(stats?.recentActivity ?? []).map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 text-sm">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate">{a.action}</p>
                      <p className="text-xs text-muted-foreground">{a.module} · {new Date(a.created_at).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
