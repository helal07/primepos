import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import ReportToolbar from "@/components/reports/ReportToolbar";

export default function DueSaleReport() {
  const [locationId, setLocationId] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["report_due_sales", locationId],
    queryFn: async () => {
      const filter: Record<string, any> = { payment_status: { in: "due,partial" } };
      if (locationId) filter.warehouse_id = locationId;
      const rows = await rest.all<any>("sales", {
        filter, with: ["customer"], sort: "-sale_date", perPage: 1000,
      });
      return rows.map((r) => ({ ...r, customers: r.customer ?? null }));
    },
  });

  const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2 });
  const total = (data ?? []).reduce((s, r: any) => s + Number(r.total_amount), 0);

  const exportData = useMemo(() => ({
    columns: ["Invoice", "Date", "Customer", "Status", "Amount"],
    rows: (data ?? []).map((s: any) => [s.invoice_number, s.sale_date, s.customers?.name || "Walk-in", s.payment_status, fmt(Number(s.total_amount))]),
    filename: "due-sale-report",
    title: "Due Sale Report",
  }), [data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Due Sale Report" subtitle="All sales with pending payments" />
      <ReportToolbar showLocationFilter locationId={locationId} onLocationChange={setLocationId} exportData={exportData} />
      <div className="print-area space-y-6">
        {isLoading ? <Skeleton className="h-60 w-full" /> : (
          <Card><CardContent className="pt-4">
            <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data ?? []).map((s: any) => (
                <TableRow key={s.id}><TableCell className="font-mono text-sm">{s.invoice_number}</TableCell><TableCell>{s.sale_date}</TableCell><TableCell>{s.customers?.name || "Walk-in"}</TableCell><TableCell><Badge variant={s.payment_status === "partial" ? "secondary" : "destructive"}>{s.payment_status}</Badge></TableCell><TableCell className="text-right">৳ {fmt(Number(s.total_amount))}</TableCell></TableRow>
              ))}
              {(data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No due sales</TableCell></TableRow>}
              <TableRow className="font-bold bg-muted/50"><TableCell colSpan={4}>Total Due</TableCell><TableCell className="text-right">৳ {fmt(total)}</TableCell></TableRow>
            </TableBody></Table>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
