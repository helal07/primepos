import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { useWarehouses } from "@/hooks/useWarehouses";

const COLORS = ["hsl(201,96%,32%)", "hsl(215,25%,27%)", "hsl(201,96%,42%)", "hsl(215,16%,47%)", "hsl(201,60%,60%)"];

function LocationFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: warehouses } = useWarehouses();
  return (
    <div className="space-y-1">
      <Label>Business Location</Label>
      <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
        <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All locations</SelectItem>
          {(warehouses ?? []).filter(w => w.is_active).map(w => (
            <SelectItem key={w.id} value={w.id}>{w.name}{w.code ? ` (${w.code})` : ""}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SalesReport() {
  const [from, setFrom] = useState(() => new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["report_sales", from, to, locationId],
    queryFn: async () => {
      let q = supabase.from("sales").select("total_amount, sale_date, payment_method, payment_status, customers(name)").gte("sale_date", from).lte("sale_date", to).order("sale_date");
      if (locationId) q = q.eq("warehouse_id", locationId);
      const { data: sales, error } = await q;
      if (error) throw error;

      const totalRevenue = (sales ?? []).reduce((s, r: any) => s + Number(r.total_amount), 0);
      const totalSales = (sales ?? []).length;
      const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;

      const dailyMap: Record<string, number> = {};
      const methodMap: Record<string, number> = {};
      (sales ?? []).forEach((s: any) => {
        dailyMap[s.sale_date] = (dailyMap[s.sale_date] || 0) + Number(s.total_amount);
        const m = s.payment_method || "Other";
        methodMap[m] = (methodMap[m] || 0) + Number(s.total_amount);
      });

      const dailyChart = Object.entries(dailyMap).sort().map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString("en", { day: "2-digit", month: "short" }), amount,
      }));
      const methodChart = Object.entries(methodMap).map(([name, value]) => ({ name, value }));

      return { totalRevenue, totalSales, avgSale, dailyChart, methodChart, sales: sales ?? [] };
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" /></div>
        <div className="space-y-1"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" /></div>
        <LocationFilter value={locationId} onChange={setLocationId} />
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold">৳{(data?.totalRevenue ?? 0).toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Sales</p><p className="text-xl font-bold">{data?.totalSales ?? 0}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Average Sale</p><p className="text-xl font-bold">৳{Math.round(data?.avgSale ?? 0).toLocaleString()}</p></CardContent></Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Revenue</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.dailyChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(215,16%,47%)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(215,16%,47%)" }} />
                      <Tooltip formatter={(v: number) => [`৳${v.toLocaleString()}`, "Revenue"]} />
                      <Bar dataKey="amount" fill="hsl(201,96%,32%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Payment Methods</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data?.methodChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => e.name}>
                        {(data?.methodChart ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(v: number) => `৳${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function InventoryReport() {
  const [locationId, setLocationId] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["report_inventory", locationId],
    queryFn: async () => {
      let products: any[] = [];
      if (locationId) {
        const { data, error } = await supabase
          .from("warehouse_stock")
          .select("quantity, products!inner(name, selling_price, purchase_price, categories(name))")
          .eq("warehouse_id", locationId);
        if (error) throw error;
        products = (data ?? []).map((r: any) => ({
          name: r.products.name,
          stock_quantity: Number(r.quantity),
          selling_price: r.products.selling_price,
          purchase_price: r.products.purchase_price,
          categories: r.products.categories,
        }));
      } else {
        const { data, error } = await supabase.from("products").select("name, stock_quantity, selling_price, purchase_price, categories(name)").order("stock_quantity");
        if (error) throw error;
        products = data ?? [];
      }

      const totalStock = (products ?? []).reduce((s, p: any) => s + Number(p.stock_quantity), 0);
      const totalValue = (products ?? []).reduce((s, p: any) => s + Number(p.stock_quantity) * Number(p.purchase_price), 0);
      const lowStock = (products ?? []).filter((p: any) => p.stock_quantity < 5);

      const categoryMap: Record<string, { name: string; count: number; value: number }> = {};
      (products ?? []).forEach((p: any) => {
        const cat = p.categories?.name || "Uncategorized";
        if (!categoryMap[cat]) categoryMap[cat] = { name: cat, count: 0, value: 0 };
        categoryMap[cat].count += Number(p.stock_quantity);
        categoryMap[cat].value += Number(p.stock_quantity) * Number(p.purchase_price);
      });
      const categoryChart = Object.values(categoryMap).sort((a, b) => b.value - a.value);

      return { totalStock, totalValue, lowStock, products: products ?? [], categoryChart };
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end"><LocationFilter value={locationId} onChange={setLocationId} /></div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Stock Units</p><p className="text-xl font-bold">{(data?.totalStock ?? 0).toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Inventory Value</p><p className="text-xl font-bold">৳{(data?.totalValue ?? 0).toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Low Stock Items</p><p className="text-xl font-bold text-destructive">{data?.lowStock?.length ?? 0}</p></CardContent></Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Stock by Category</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.categoryChart} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(215,16%,47%)" }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "hsl(215,16%,47%)" }} />
                      <Tooltip formatter={(v: number) => [v.toLocaleString(), "Units"]} />
                      <Bar dataKey="count" fill="hsl(201,96%,32%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Low Stock Items</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[250px] overflow-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Stock</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(data?.lowStock ?? []).length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">All items adequately stocked</TableCell></TableRow> :
                        (data?.lowStock ?? []).map((p: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="text-destructive font-medium">{p.stock_quantity}</TableCell>
                            <TableCell>৳{(p.stock_quantity * p.purchase_price).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function PurchaseReport() {
  const [from, setFrom] = useState(() => new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["report_purchases", from, to, locationId],
    queryFn: async () => {
      let q = supabase.from("purchases").select("total_amount, purchase_date, payment_status, suppliers(name)").gte("purchase_date", from).lte("purchase_date", to).order("purchase_date");
      if (locationId) q = q.eq("warehouse_id", locationId);
      const { data: purchases, error } = await q;
      if (error) throw error;

      const totalSpent = (purchases ?? []).reduce((s, r: any) => s + Number(r.total_amount), 0);
      const totalPurchases = (purchases ?? []).length;
      const unpaid = (purchases ?? []).filter((p: any) => p.payment_status !== "paid").length;

      const dailyMap: Record<string, number> = {};
      (purchases ?? []).forEach((p: any) => {
        dailyMap[p.purchase_date] = (dailyMap[p.purchase_date] || 0) + Number(p.total_amount);
      });
      const dailyChart = Object.entries(dailyMap).sort().map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString("en", { day: "2-digit", month: "short" }), amount,
      }));

      return { totalSpent, totalPurchases, unpaid, dailyChart };
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" /></div>
        <div className="space-y-1"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" /></div>
        <LocationFilter value={locationId} onChange={setLocationId} />
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Spent</p><p className="text-xl font-bold">৳{(data?.totalSpent ?? 0).toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Purchases</p><p className="text-xl font-bold">{data?.totalPurchases ?? 0}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unpaid</p><p className="text-xl font-bold text-destructive">{data?.unpaid ?? 0}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Purchases</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.dailyChart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(215,16%,47%)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(215,16%,47%)" }} />
                    <Tooltip formatter={(v: number) => [`৳${v.toLocaleString()}`, "Amount"]} />
                    <Bar dataKey="amount" fill="hsl(215,25%,27%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function Reports() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Business intelligence and analytics" />
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Report</TabsTrigger>
        </TabsList>
        <TabsContent value="sales"><SalesReport /></TabsContent>
        <TabsContent value="inventory"><InventoryReport /></TabsContent>
        <TabsContent value="purchases"><PurchaseReport /></TabsContent>
      </Tabs>
    </div>
  );
}
