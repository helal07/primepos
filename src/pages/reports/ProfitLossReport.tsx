import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react";
import ReportToolbar from "@/components/reports/ReportToolbar";

function fmt(n: number) {
  return `৳${Math.round(n).toLocaleString()}`;
}

export default function ProfitLossReport() {
  const [from, setFrom] = useState(() => new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["report_profit_loss", from, to],
    queryFn: async () => {
      const [salesRes, purchasesRes, productsRes] = await Promise.all([
        supabase.from("sales").select("total_amount, discount_amount, shipping_cost, tax_amount, subtotal").gte("sale_date", from).lte("sale_date", to),
        supabase.from("purchases").select("total_amount, discount_amount, shipping_cost, tax_amount, subtotal").gte("purchase_date", from).lte("purchase_date", to),
        supabase.from("products").select("stock_quantity, purchase_price, selling_price"),
      ]);

      const sales = salesRes.data ?? [];
      const purchases = purchasesRes.data ?? [];
      const products = productsRes.data ?? [];

      const totalSales = sales.reduce((s, r) => s + Number(r.total_amount), 0);
      const totalSalesDiscount = sales.reduce((s, r) => s + Number(r.discount_amount), 0);
      const sellShipping = sales.reduce((s, r) => s + Number(r.shipping_cost), 0);
      const sellTax = sales.reduce((s, r) => s + Number(r.tax_amount), 0);

      const totalPurchase = purchases.reduce((s, r) => s + Number(r.total_amount), 0);
      const purchaseDiscount = purchases.reduce((s, r) => s + Number(r.discount_amount), 0);
      const purchaseShipping = purchases.reduce((s, r) => s + Number(r.shipping_cost), 0);
      const purchaseTax = purchases.reduce((s, r) => s + Number(r.tax_amount), 0);

      const closingStockPurchase = products.reduce((s, p) => s + Number(p.stock_quantity) * Number(p.purchase_price), 0);
      const closingStockSale = products.reduce((s, p) => s + Number(p.stock_quantity) * Number(p.selling_price), 0);

      const cogs = totalPurchase - closingStockPurchase;
      const grossProfit = totalSales - cogs;
      const totalExpenses = sellShipping + purchaseShipping;
      const netProfit = grossProfit - totalExpenses;

      return {
        totalSales, totalSalesDiscount, sellShipping, sellTax,
        totalPurchase, purchaseDiscount, purchaseShipping, purchaseTax,
        closingStockPurchase, closingStockSale,
        cogs, grossProfit, netProfit, totalExpenses,
      };
    },
  });

  const exportData = useMemo(() => ({
    columns: ["Item", "Amount"],
    rows: data ? [
      ["Total Sales", Math.round(data.totalSales)],
      ["Total Purchase", Math.round(data.totalPurchase)],
      ["Closing Stock (Purchase)", Math.round(data.closingStockPurchase)],
      ["Closing Stock (Sale)", Math.round(data.closingStockSale)],
      ["COGS", Math.round(data.cogs)],
      ["Gross Profit", Math.round(data.grossProfit)],
      ["Total Expenses", Math.round(data.totalExpenses)],
      ["Net Profit", Math.round(data.netProfit)],
    ] as (string | number)[][] : [],
    filename: `profit-loss-${from}-to-${to}`,
    title: "Profit & Loss Report",
  }), [data, from, to]);

  return (
    <div className="space-y-6">
      <PageHeader title="Profit & Loss Report" description="Financial overview for the selected period" />
      <ReportToolbar from={from} to={to} onFromChange={setFrom} onToChange={setTo} exportData={exportData} />

      <div className="print-area space-y-6">
        {isLoading ? <Skeleton className="h-96 w-full" /> : data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Total Sales</p><p className="text-lg font-bold">{fmt(data.totalSales)}</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><Package className="h-5 w-5 text-orange-500" /></div>
                <div><p className="text-xs text-muted-foreground">Total Purchase</p><p className="text-lg font-bold">{fmt(data.totalPurchase)}</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
                <div><p className="text-xs text-muted-foreground">Gross Profit</p><p className={`text-lg font-bold ${data.grossProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(data.grossProfit)}</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${data.netProfit >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                  {data.netProfit >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
                </div>
                <div><p className="text-xs text-muted-foreground">Net Profit</p><p className={`text-lg font-bold ${data.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(data.netProfit)}</p></div>
              </CardContent></Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card><CardHeader className="pb-3"><CardTitle className="text-base">Revenue & Expenses</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Row label="Total Purchase" value={fmt(data.totalPurchase)} />
                  <Row label="Purchase Shipping" value={fmt(data.purchaseShipping)} />
                  <Row label="Purchase Tax" value={fmt(data.purchaseTax)} />
                  <Row label="Purchase Discount" value={fmt(data.purchaseDiscount)} variant="green" />
                  <div className="border-t my-2" />
                  <Row label="Sell Shipping Charge" value={fmt(data.sellShipping)} />
                  <Row label="Sell Discount" value={fmt(data.totalSalesDiscount)} variant="red" />
                  <Row label="Sell Tax" value={fmt(data.sellTax)} />
                </CardContent>
              </Card>
              <Card><CardHeader className="pb-3"><CardTitle className="text-base">Stock & Returns</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Row label="Closing Stock (Purchase Price)" value={fmt(data.closingStockPurchase)} />
                  <Row label="Closing Stock (Selling Price)" value={fmt(data.closingStockSale)} />
                  <Row label="Total Sales" value={fmt(data.totalSales)} variant="green" />
                </CardContent>
              </Card>
            </div>

            <Card className="border-2 border-primary/20"><CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">Cost of Goods Sold (COGS)</p><p className="text-xs text-muted-foreground/70">Total Purchase − Closing Stock (Purchase Price)</p></div>
                <p className="text-lg font-bold">{fmt(data.cogs)}</p>
              </div>
              <div className="border-t" />
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">Gross Profit</p><p className="text-xs text-muted-foreground/70">Total Sales − COGS</p></div>
                <Badge variant={data.grossProfit >= 0 ? "default" : "destructive"} className="text-base px-3 py-1">{fmt(data.grossProfit)}</Badge>
              </div>
              <div className="border-t" />
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Net Profit</p><p className="text-xs text-muted-foreground/70">Gross Profit − Total Expenses ({fmt(data.totalExpenses)})</p></div>
                <Badge variant={data.netProfit >= 0 ? "default" : "destructive"} className="text-lg px-4 py-1.5">{fmt(data.netProfit)}</Badge>
              </div>
            </CardContent></Card>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, variant }: { label: string; value: string; variant?: "green" | "red" }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${variant === "green" ? "text-emerald-600" : variant === "red" ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}
