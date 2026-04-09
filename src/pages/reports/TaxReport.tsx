import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, TrendingUp, TrendingDown } from "lucide-react";
import ReportToolbar from "@/components/reports/ReportToolbar";

export default function TaxReport() {
  const [from, setFrom] = useState(() => new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["report_tax", from, to],
    queryFn: async () => {
      const [salesRes, purchasesRes] = await Promise.all([
        supabase.from("sales").select("invoice_number, sale_date, subtotal, tax_amount, total_amount").gte("sale_date", from).lte("sale_date", to).order("sale_date"),
        supabase.from("purchases").select("reference_number, purchase_date, subtotal, tax_amount, total_amount").gte("purchase_date", from).lte("purchase_date", to).order("purchase_date"),
      ]);
      const sales = salesRes.data ?? [];
      const purchases = purchasesRes.data ?? [];
      const totalSalesTax = sales.reduce((s, r) => s + Number(r.tax_amount), 0);
      const totalPurchaseTax = purchases.reduce((s, r) => s + Number(r.tax_amount), 0);
      return { sales, purchases, totalSalesTax, totalPurchaseTax, netTax: totalSalesTax - totalPurchaseTax };
    },
  });

  const exportData = useMemo(() => ({
    columns: ["Type", "Reference", "Date", "Subtotal", "Tax"],
    rows: [
      ...(data?.sales ?? []).map((s: any) => ["Sale", s.invoice_number, s.sale_date, Number(s.subtotal).toLocaleString(), Number(s.tax_amount).toLocaleString()]),
      ...(data?.purchases ?? []).map((p: any) => ["Purchase", p.reference_number || "—", p.purchase_date, Number(p.subtotal).toLocaleString(), Number(p.tax_amount).toLocaleString()]),
    ] as (string | number)[][],
    filename: `tax-report-${from}-to-${to}`,
    title: "Tax Report",
  }), [data, from, to]);

  return (
    <div className="space-y-6">
      <PageHeader title="Tax Report" description="Tax collected and paid summary" />
      <ReportToolbar from={from} to={to} onFromChange={setFrom} onToChange={setTo} exportData={exportData} />
      <div className="print-area space-y-6">
        {isLoading ? <Skeleton className="h-64 w-full" /> : data && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
                <div><p className="text-xs text-muted-foreground">Tax Collected (Sales)</p><p className="text-lg font-bold text-emerald-600">৳{data.totalSalesTax.toLocaleString()}</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><TrendingDown className="h-5 w-5 text-orange-500" /></div>
                <div><p className="text-xs text-muted-foreground">Tax Paid (Purchases)</p><p className="text-lg font-bold text-orange-600">৳{data.totalPurchaseTax.toLocaleString()}</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Receipt className="h-5 w-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">Net Tax Liability</p><p className={`text-lg font-bold ${data.netTax >= 0 ? "text-primary" : "text-destructive"}`}>৳{data.netTax.toLocaleString()}</p></div>
              </CardContent></Card>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card><CardHeader className="pb-3"><CardTitle className="text-base">Sales Tax Details</CardTitle></CardHeader>
                <CardContent><div className="overflow-auto max-h-[400px]">
                  <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead className="text-right">Tax</TableHead></TableRow></TableHeader>
                  <TableBody>{data.sales.map((s: any, i: number) => (
                    <TableRow key={i}><TableCell className="font-medium">{s.invoice_number}</TableCell><TableCell>{new Date(s.sale_date).toLocaleDateString()}</TableCell><TableCell className="text-right">৳{Number(s.subtotal).toLocaleString()}</TableCell><TableCell className="text-right text-emerald-600">৳{Number(s.tax_amount).toLocaleString()}</TableCell></TableRow>
                  ))}{data.sales.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No sales</TableCell></TableRow>}</TableBody></Table>
                </div></CardContent>
              </Card>
              <Card><CardHeader className="pb-3"><CardTitle className="text-base">Purchase Tax Details</CardTitle></CardHeader>
                <CardContent><div className="overflow-auto max-h-[400px]">
                  <Table><TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead className="text-right">Tax</TableHead></TableRow></TableHeader>
                  <TableBody>{data.purchases.map((p: any, i: number) => (
                    <TableRow key={i}><TableCell className="font-medium">{p.reference_number || "—"}</TableCell><TableCell>{new Date(p.purchase_date).toLocaleDateString()}</TableCell><TableCell className="text-right">৳{Number(p.subtotal).toLocaleString()}</TableCell><TableCell className="text-right text-orange-600">৳{Number(p.tax_amount).toLocaleString()}</TableCell></TableRow>
                  ))}{data.purchases.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No purchases</TableCell></TableRow>}</TableBody></Table>
                </div></CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
