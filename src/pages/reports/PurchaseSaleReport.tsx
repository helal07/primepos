import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportToolbar from "@/components/reports/ReportToolbar";

export default function PurchaseSaleReport() {
  const [from, setFrom] = useState(() => new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [locationId, setLocationId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["report_purchase_sale", from, to, paymentMethod, paymentStatus, locationId],
    queryFn: async () => {
      const baseS: Record<string, any> = { sale_date: { gte: from, lte: to } };
      const baseP: Record<string, any> = { purchase_date: { gte: from, lte: to } };
      if (paymentMethod !== "all") { baseS.payment_method = paymentMethod; baseP.payment_method = paymentMethod; }
      if (paymentStatus !== "all") { baseS.payment_status = paymentStatus; baseP.payment_status = paymentStatus; }
      if (locationId) { baseS.warehouse_id = locationId; baseP.warehouse_id = locationId; }
      const [salesRaw, purchasesRaw] = await Promise.all([
        rest.all<any>("sales", { filter: baseS, with: ["customer"], sort: "-sale_date", perPage: 2000 }),
        rest.all<any>("purchases", { filter: baseP, with: ["supplier"], sort: "-purchase_date", perPage: 2000 }),
      ]);
      const sales = salesRaw.map((s: any) => ({ ...s, customers: s.customer ?? null }));
      const purchases = purchasesRaw.map((p: any) => ({ ...p, suppliers: p.supplier ?? null }));
      return {
        sales, purchases,
        totalSales: sales.reduce((s, r: any) => s + Number(r.total_amount), 0),
        totalPurchases: purchases.reduce((s, r: any) => s + Number(r.total_amount), 0),
      };
    },
  });

  const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2 });

  const exportData = useMemo(() => ({
    columns: ["Type", "Ref", "Date", "Contact", "Method", "Status", "Amount"],
    rows: [
      ...(data?.sales ?? []).map((s: any) => ["Sale", s.invoice_number, s.sale_date, s.customers?.name || "Walk-in", s.payment_method || "-", s.payment_status, fmt(Number(s.total_amount))]),
      ...(data?.purchases ?? []).map((p: any) => ["Purchase", p.reference_number, p.purchase_date, (p.suppliers as any)?.name || "-", p.payment_method || "-", p.payment_status, fmt(Number(p.total_amount))]),
    ] as (string | number)[][],
    filename: `purchase-sale-${from}-to-${to}`,
    title: "Purchase & Sale Report",
  }), [data, from, to]);

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase & Sale Report" subtitle="Combined view of purchases and sales" />
      <ReportToolbar
        from={from} to={to} onFromChange={setFrom} onToChange={setTo}
        showPaymentFilter paymentMethod={paymentMethod} onPaymentMethodChange={setPaymentMethod}
        showStatusFilter paymentStatus={paymentStatus} onPaymentStatusChange={setPaymentStatus}
        showLocationFilter locationId={locationId} onLocationChange={setLocationId}
        exportData={exportData}
      />
      <div className="print-area space-y-6">
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
                <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>{data.sales.map((s: any) => (
                  <TableRow key={s.id}><TableCell className="font-mono text-sm">{s.invoice_number}</TableCell><TableCell>{s.sale_date}</TableCell><TableCell>{s.customers?.name || "Walk-in"}</TableCell><TableCell>{s.payment_method || "-"}</TableCell><TableCell>{s.payment_status}</TableCell><TableCell className="text-right">৳ {fmt(Number(s.total_amount))}</TableCell></TableRow>
                ))}</TableBody></Table>
              </CardContent></Card></TabsContent>
              <TabsContent value="purchases"><Card><CardContent className="pt-4">
                <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>{data.purchases.map((p: any) => (
                  <TableRow key={p.id}><TableCell className="font-mono text-sm">{p.reference_number}</TableCell><TableCell>{p.purchase_date}</TableCell><TableCell>{(p.suppliers as any)?.name || "-"}</TableCell><TableCell>{p.payment_method || "-"}</TableCell><TableCell>{p.payment_status}</TableCell><TableCell className="text-right">৳ {fmt(Number(p.total_amount))}</TableCell></TableRow>
                ))}</TableBody></Table>
              </CardContent></Card></TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
