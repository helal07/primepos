import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function RegisterReport() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["report_register", date],
    queryFn: async () => {
      const { data: sales } = await supabase.from("sales").select("id, invoice_number, total_amount, payment_method, payment_status, created_at").eq("sale_date", date).order("created_at");
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

  return (
    <div className="space-y-6">
      <PageHeader title="Register Report" subtitle="Cash register summary for a day" />
      <div className="flex items-end gap-3">
        <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" /></div>
      </div>
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
  );
}
