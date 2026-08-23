import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import ReportToolbar from "@/components/reports/ReportToolbar";

export default function InstallmentReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["report_installment"],
    queryFn: async () => {
      const [salesRaw, collections] = await Promise.all([
        rest.all<any>("installment_sales", { with: ["customer"], sort: "-created_at", perPage: 2000 }),
        rest.all<any>("installment_collections", { perPage: 5000 }),
      ]);
      const sales = salesRaw.map((s: any) => ({ ...s, customers: s.customer ?? null }));
      const totalSold = sales.reduce((s, r: any) => s + Number(r.total_amount), 0);
      const totalCollected = collections.reduce((s, r: any) => s + Number(r.amount), 0);
      const totalRemaining = sales.reduce((s, r: any) => s + Number(r.remaining_amount), 0);
      return { sales, totalSold, totalCollected, totalRemaining };
    },
  });

  const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2 });
  const statusColor: Record<string, string> = { active: "default", completed: "secondary", overdue: "destructive" };

  const exportData = useMemo(() => ({
    columns: ["Invoice", "Date", "Customer", "Status", "Total", "Down Payment", "Remaining"],
    rows: (data?.sales ?? []).map((s: any) => [s.invoice_number, s.start_date, s.customers?.name || "-", s.status, fmt(Number(s.total_amount)), fmt(Number(s.down_payment)), fmt(Number(s.remaining_amount))]),
    filename: "installment-report",
    title: "Installment Sale Report",
  }), [data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Installment Sale Report" subtitle="Installment sales and collection summary" />
      <ReportToolbar exportData={exportData} />
      <div className="print-area space-y-6">
        {isLoading ? <Skeleton className="h-60 w-full" /> : data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total Installment Sales</p><p className="text-xl font-bold">৳ {fmt(data.totalSold)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total Collected</p><p className="text-xl font-bold text-emerald-600">৳ {fmt(data.totalCollected)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Remaining</p><p className="text-xl font-bold text-destructive">৳ {fmt(data.totalRemaining)}</p></CardContent></Card>
            </div>
            <Card><CardContent className="pt-4">
              <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Down Payment</TableHead><TableHead className="text-right">Remaining</TableHead></TableRow></TableHeader>
              <TableBody>{data.sales.map((s: any) => (
                <TableRow key={s.id}><TableCell className="font-mono text-sm">{s.invoice_number}</TableCell><TableCell>{s.start_date}</TableCell><TableCell>{s.customers?.name || "-"}</TableCell><TableCell><Badge variant={statusColor[s.status] as any || "secondary"}>{s.status}</Badge></TableCell><TableCell className="text-right">৳ {fmt(Number(s.total_amount))}</TableCell><TableCell className="text-right">৳ {fmt(Number(s.down_payment))}</TableCell><TableCell className="text-right">৳ {fmt(Number(s.remaining_amount))}</TableCell></TableRow>
              ))}{data.sales.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No installment sales</TableCell></TableRow>}</TableBody></Table>
            </CardContent></Card>
          </>
        )}
      </div>
    </div>
  );
}
