import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import ReportToolbar from "@/components/reports/ReportToolbar";

export default function RegisterReport() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["report_register", date, paymentMethod],
    queryFn: async () => {
      let q = supabase.from("sales").select("id, invoice_number, total_amount, payment_method, payment_status, created_at").eq("sale_date", date).order("created_at");
      if (paymentMethod !== "all") q = q.eq("payment_method", paymentMethod);
      const { data: sales } = await q;
      const items = sales ?? [];
      const methodTotals: Record<string, number> = {};
      items.forEach((s: any) => {
        const m = s.payment_method || "Other";
        methodTotals[m] = (methodTotals[m] || 0) + Number(s.total_amount);
      });
      const total = items.reduce((s, r: any) => s + Number(r.total_amount), 0);
      return { items, methodTotals: Object.entries(methodTotals), total };
    },
  });

  const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2 });

  const exportData = useMemo(() => ({
    columns: ["#", "Invoice", "Time", "Method", "Status", "Amount"],
    rows: (data?.items ?? []).map((s: any, i: number) => [i + 1, s.invoice_number, new Date(s.created_at).toLocaleTimeString(), s.payment_method || "-", s.payment_status, fmt(Number(s.total_amount))]),
    filename: `register-report-${date}`,
    title: `Register Report — ${date}`,
  }), [data, date]);

  return (
    <div className="space-y-6">
      <PageHeader title="Register Report" subtitle="Cash register summary for a day" />
      <ReportToolbar
        singleDate={date} onDateChange={setDate}
        showPaymentFilter paymentMethod={paymentMethod} onPaymentMethodChange={setPaymentMethod}
        exportData={exportData}
      />
      <div className="print-area space-y-6">
        {isLoading ? <Skeleton className="h-60 w-full" /> : data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total Sales</p><p className="text-xl font-bold">৳ {fmt(data.total)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Transactions</p><p className="text-xl font-bold">{data.items.length}</p></CardContent></Card>
              {data.methodTotals.map(([method, amount]) => (
                <Card key={method}><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">{method}</p><p className="text-xl font-bold">৳ {fmt(amount)}</p></CardContent></Card>
              ))}
            </div>
            <Card><CardContent className="pt-4">
              <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Invoice</TableHead><TableHead>Time</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>{data.items.map((s: any, i: number) => (
                <TableRow key={s.id}><TableCell>{i + 1}</TableCell><TableCell className="font-mono text-sm">{s.invoice_number}</TableCell><TableCell>{new Date(s.created_at).toLocaleTimeString()}</TableCell><TableCell>{s.payment_method || "-"}</TableCell><TableCell>{s.payment_status}</TableCell><TableCell className="text-right">৳ {fmt(Number(s.total_amount))}</TableCell></TableRow>
              ))}{data.items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No sales</TableCell></TableRow>}
              <TableRow className="font-bold bg-muted/50"><TableCell colSpan={5}>Total</TableCell><TableCell className="text-right">৳ {fmt(data.total)}</TableCell></TableRow>
              </TableBody></Table>
            </CardContent></Card>
          </>
        )}
      </div>
    </div>
  );
}
