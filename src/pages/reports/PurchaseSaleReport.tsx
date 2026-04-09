import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PurchaseSaleReport() {
  const [from, setFrom] = useState(() => new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["report_purchase_sale", from, to],
    queryFn: async () => {
      const [salesRes, purchasesRes] = await Promise.all([
        supabase.from("sales").select("id, invoice_number, sale_date, total_amount, payment_status, payment_method, customers(name)").gte("sale_date", from).lte("sale_date", to).order("sale_date", { ascending: false }),
        supabase.from("purchases").select("id, reference_number, purchase_date, total_amount, payment_status, payment_method, suppliers(name)").gte("purchase_date", from).lte("purchase_date", to).order("purchase_date", { ascending: false }),
      ]);
      const sales = salesRes.data ?? [];
      const purchases = purchasesRes.data ?? [];
      return {
        sales, purchases,
        totalSales: sales.reduce((s, r: any) => s + Number(r.total_amount), 0),
        totalPurchases: purchases.reduce((s, r: any) => s + Number(r.total_amount), 0),
      };
    },
  });

  const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase & Sale Report" subtitle="Combined view of purchases and sales" />
      <div className="flex flex-wrap gap-3 items-end">
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-44" /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-44" /></div>
      </div>
      {isLoading ? <Skeleton className="h-60 w-full" /> : data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total Sales</p><p className="text-xl font-bold text-emerald-600">৳ {fmt(data.totalSales)}</p></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total Purchases</p><p className="text-xl font-bold text-destructive">৳ {fmt(data.totalPurchases)}</p></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Difference</p><p className="text-xl font-bold">৳ {fmt(data.totalSales - data.totalPurchases)}</p></CardContent></Card>
          </div>
          <Tabs defaultValue="sales">
            <TabsList><TabsTrigger value="sales">Sales ({data.sales.length})</TabsTrigger><TabsTrigger value="purchases">Purchases ({data.purchases.length})</TabsTrigger></TabsList>
            <TabsContent value="sales"><Card><CardContent className="pt-4">
              <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>{data.sales.map((s: any) => (
                <TableRow key={s.id}><TableCell className="font-mono text-sm">{s.invoice_number}</TableCell><TableCell>{s.sale_date}</TableCell><TableCell>{s.customers?.name || "Walk-in"}</TableCell><TableCell>{s.payment_method || "-"}</TableCell><TableCell className="text-right">৳ {fmt(Number(s.total_amount))}</TableCell></TableRow>
              ))}</TableBody></Table>
            </CardContent></Card></TabsContent>
            <TabsContent value="purchases"><Card><CardContent className="pt-4">
              <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>{data.purchases.map((p: any) => (
                <TableRow key={p.id}><TableCell className="font-mono text-sm">{p.reference_number}</TableCell><TableCell>{p.purchase_date}</TableCell><TableCell>{(p.suppliers as any)?.name || "-"}</TableCell><TableCell>{p.payment_method || "-"}</TableCell><TableCell className="text-right">৳ {fmt(Number(p.total_amount))}</TableCell></TableRow>
              ))}</TableBody></Table>
            </CardContent></Card></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
