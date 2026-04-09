import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown } from "lucide-react";

export default function DailySummaryReport() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["report_daily_summary", date],
    queryFn: async () => {
      const [salesRes, purchasesRes] = await Promise.all([
        supabase.from("sales").select("id, total_amount, payment_method, payment_status, customer_id, customers(name)").eq("sale_date", date),
        supabase.from("purchases").select("id, total_amount, payment_method, payment_status, supplier_id, suppliers(name)").eq("purchase_date", date),
      ]);
      const sales = salesRes.data ?? [];
      const purchases = purchasesRes.data ?? [];
      const totalSales = sales.reduce((s: number, r: any) => s + Number(r.total_amount), 0);
      const totalPurchases = purchases.reduce((s: number, r: any) => s + Number(r.total_amount), 0);
      return { sales, purchases, totalSales, totalPurchases, netProfit: totalSales - totalPurchases };
    },
  });

  const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <PageHeader title="Daily Summary Report" subtitle="Overview of daily sales and purchases" />
      <div className="flex items-end gap-3">
        <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" /></div>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4 flex items-center gap-3"><ShoppingCart className="h-8 w-8 text-primary" /><div><p className="text-xs text-muted-foreground">Total Sales</p><p className="text-xl font-bold">৳ {fmt(data.totalSales)}</p></div></CardContent></Card>
            <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingDown className="h-8 w-8 text-destructive" /><div><p className="text-xs text-muted-foreground">Total Purchases</p><p className="text-xl font-bold">৳ {fmt(data.totalPurchases)}</p></div></CardContent></Card>
            <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingUp className="h-8 w-8 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Net</p><p className="text-xl font-bold">৳ {fmt(data.netProfit)}</p></div></CardContent></Card>
            <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="h-8 w-8 text-amber-600" /><div><p className="text-xs text-muted-foreground">Transactions</p><p className="text-xl font-bold">{data.sales.length + data.purchases.length}</p></div></CardContent></Card>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-base">Sales ({data.sales.length})</CardTitle></CardHeader><CardContent>
              <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Customer</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>{data.sales.map((s: any, i: number) => (
                <TableRow key={s.id}><TableCell>{i + 1}</TableCell><TableCell>{s.customers?.name || "Walk-in"}</TableCell><TableCell>{s.payment_method || "-"}</TableCell><TableCell className="text-right">৳ {fmt(Number(s.total_amount))}</TableCell></TableRow>
              ))}{data.sales.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No sales</TableCell></TableRow>}</TableBody></Table>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Purchases ({data.purchases.length})</CardTitle></CardHeader><CardContent>
              <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Supplier</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>{data.purchases.map((p: any, i: number) => (
                <TableRow key={p.id}><TableCell>{i + 1}</TableCell><TableCell>{(p.suppliers as any)?.name || "-"}</TableCell><TableCell>{p.payment_method || "-"}</TableCell><TableCell className="text-right">৳ {fmt(Number(p.total_amount))}</TableCell></TableRow>
              ))}{data.purchases.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No purchases</TableCell></TableRow>}</TableBody></Table>
            </CardContent></Card>
          </div>
        </>
      )}
    </div>
  );
}
