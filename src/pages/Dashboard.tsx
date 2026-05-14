import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, Package, AlertTriangle, Clock, TrendingUp, TrendingDown,
  ShoppingCart, Plus, MonitorSmartphone, Activity, ArrowUpRight,
  ArrowDownRight, Banknote, CreditCard, BarChart3, AlertCircle,
} from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  CartesianGrid, Bar, BarChart, Cell, PieChart, Pie,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboard";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();
  const [chartView, setChartView] = useState<"monthly" | "weekly">("monthly");

  const summaryCards = [
    {
      title: "Today's Sales",
      value: `৳${(stats?.todaySales ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Revenue (MTD)",
      value: `৳${(stats?.monthRevenue ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
      change: stats?.revenueGrowth,
    },
    {
      title: "Total Purchase (MTD)",
      value: `৳${(stats?.totalPurchases ?? 0).toLocaleString()}`,
      icon: Banknote,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Profit (MTD)",
      value: `৳${(stats?.profit ?? 0).toLocaleString()}`,
      icon: (stats?.profit ?? 0) >= 0 ? TrendingUp : TrendingDown,
      color: (stats?.profit ?? 0) >= 0 ? "text-emerald-600" : "text-destructive",
      bg: (stats?.profit ?? 0) >= 0 ? "bg-emerald-50" : "bg-destructive/10",
    },
    {
      title: "Sale Due",
      value: `৳${(stats?.saleDue ?? 0).toLocaleString()}`,
      icon: CreditCard,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Purchase Due",
      value: `৳${(stats?.purchaseDue ?? 0).toLocaleString()}`,
      icon: Banknote,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Total Products",
      value: String(stats?.totalProducts ?? 0),
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Low Stock Items",
      value: String(stats?.lowStock ?? 0),
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  const chartData = chartView === "monthly" ? stats?.revenueChart : stats?.weekChart;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your business performance"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/sales/add")}>
              <Plus className="h-4 w-4 mr-1" /> New Sale
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">{card.title}</p>
                <div className={`h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.color}`} />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-20 sm:w-24" />
              ) : (
                <div className="flex items-end gap-1.5 flex-wrap">
                  <p className="text-base sm:text-xl font-bold leading-tight truncate max-w-full">{card.value}</p>
                  {card.change !== undefined && card.change !== 0 && (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] h-5 shrink-0 px-1.5 ${card.change > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                    >
                      {card.change > 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-0.5" />
                      )}
                      {Math.abs(card.change).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base font-medium">Sales Revenue</CardTitle>
            <Tabs value={chartView} onValueChange={(v) => setChartView(v as "monthly" | "weekly")}>
              <TabsList className="h-8">
                <TabsTrigger value="weekly" className="text-xs h-6 px-3">Week</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs h-6 px-3">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {isLoading ? (
            <Skeleton className="h-[220px] sm:h-[280px] w-full" />
          ) : (
            <div className="h-[220px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartView === "monthly" ? (
                  <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} interval="preserveStartEnd" minTickGap={16} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={44} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(value: number) => [`৳${value.toLocaleString()}`, "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} interval="preserveStartEnd" minTickGap={16} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={44} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(value: number) => [`৳${value.toLocaleString()}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Middle Row: Stock Alerts + Due Payments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Stock Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Stock Alerts
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/products")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (stats?.stockAlerts ?? []).length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                All stock levels are healthy
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {(stats?.stockAlerts ?? []).map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Alert at: {product.alert_quantity} units
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <Badge
                        variant={product.stock_quantity <= 0 ? "destructive" : "secondary"}
                        className={product.stock_quantity <= 0 ? "" : "bg-amber-100 text-amber-800"}
                      >
                        {product.stock_quantity <= 0 ? "Out of Stock" : `${product.stock_quantity} left`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Due Payments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-red-500" />
              Due Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sales-due">
              <TabsList className="w-full h-8 mb-3">
                <TabsTrigger value="sales-due" className="flex-1 text-xs h-6">
                  Sale Due ({(stats?.unpaidSales ?? []).length})
                </TabsTrigger>
                <TabsTrigger value="purchase-due" className="flex-1 text-xs h-6">
                  Purchase Due ({(stats?.unpaidPurchases ?? []).length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="sales-due">
                {isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (stats?.unpaidSales ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No unpaid sales</p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {(stats?.unpaidSales ?? []).map((sale: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg border">
                        <div>
                          <p className="font-medium">{sale.customers?.name || "Walk-in"}</p>
                          <p className="text-xs text-muted-foreground">{sale.invoice_number}</p>
                        </div>
                        <span className="font-semibold text-red-600">৳{Number(sale.total_amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="purchase-due">
                {isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (stats?.unpaidPurchases ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No unpaid purchases</p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {(stats?.unpaidPurchases ?? []).map((purchase: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg border">
                        <div>
                          <p className="font-medium">{purchase.suppliers?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{purchase.reference_number}</p>
                        </div>
                        <span className="font-semibold text-red-600">৳{Number(purchase.total_amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (stats?.topProducts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {(stats?.topProducts ?? []).map((product: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}
                      </div>
                      <span className="truncate">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-muted-foreground text-xs">{product.sold} sold</span>
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
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Recent Sales</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/sales")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (stats?.recentSales ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent sales</p>
            ) : (
              <div className="space-y-3">
                {(stats?.recentSales ?? []).map((sale: any) => (
                  <div key={sale.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{sale.customers?.name || "Walk-in"}</p>
                        <p className="text-xs text-muted-foreground">{sale.invoice_number}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium">৳{Number(sale.total_amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (stats?.recentActivity ?? []).length === 0 ? (
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
                      <p className="text-xs text-muted-foreground">
                        {a.module} ·{" "}
                        {new Date(a.created_at).toLocaleString([], {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
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
