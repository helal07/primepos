import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
  ShoppingCart,
  Plus,
  MonitorSmartphone,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";

const revenueData = [
  { date: "Mon", revenue: 4200 },
  { date: "Tue", revenue: 3800 },
  { date: "Wed", revenue: 5100 },
  { date: "Thu", revenue: 4700 },
  { date: "Fri", revenue: 6200 },
  { date: "Sat", revenue: 7800 },
  { date: "Sun", revenue: 5400 },
];

const topProducts = [
  { name: "iPhone 15 Pro Max", sold: 48, revenue: 62400 },
  { name: "Samsung Galaxy S24", sold: 35, revenue: 31500 },
  { name: "MacBook Air M3", sold: 22, revenue: 28600 },
  { name: "AirPods Pro 2", sold: 64, revenue: 15360 },
  { name: "iPad Pro 12.9", sold: 18, revenue: 19800 },
];

const recentSales = [
  { id: "INV-001", customer: "Ahmed Khan", amount: 1250, time: "2 min ago" },
  { id: "INV-002", customer: "Sara Ali", amount: 890, time: "15 min ago" },
  { id: "INV-003", customer: "Omar Sheikh", amount: 3400, time: "1 hr ago" },
  { id: "INV-004", customer: "Fatima Noor", amount: 560, time: "2 hrs ago" },
];

const summaryCards = [
  { title: "Today's Sales", value: "$12,450", change: "+12%", icon: DollarSign, color: "text-primary" },
  { title: "Total Products", value: "1,234", change: "+24", icon: Package, color: "text-info" },
  { title: "Low Stock Alerts", value: "18", change: "-3", icon: AlertTriangle, color: "text-warning" },
  { title: "Pending Orders", value: "42", change: "+8", icon: Clock, color: "text-muted-foreground" },
  { title: "Revenue (MTD)", value: "$148,200", change: "+18%", icon: TrendingUp, color: "text-success" },
];

export default function Dashboard() {
  const navigate = useNavigate();

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
            <Button size="sm" onClick={() => navigate("/pos")}>
              <MonitorSmartphone className="h-4 w-4 mr-1" /> POS
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-xl font-bold mt-1">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-success">{card.change}</span> from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(201, 96%, 32%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(201, 96%, 32%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(215, 16%, 47%)" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(215, 16%, 47%)" }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(201, 96%, 32%)"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.map((product, i) => (
                <div key={product.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
                    <span className="truncate">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-muted-foreground">{product.sold} sold</span>
                    <span className="font-medium">${product.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{sale.customer}</p>
                      <p className="text-xs text-muted-foreground">{sale.id}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium">${sale.amount}</p>
                    <p className="text-xs text-muted-foreground">{sale.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
