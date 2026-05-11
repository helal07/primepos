import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import ReportToolbar from "@/components/reports/ReportToolbar";

export default function TrendingProductsReport() {
  const [from, setFrom] = useState(() => new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["report_trending", from, to, locationId],
    queryFn: async () => {
      let q = supabase.from("sale_items").select("product_id, quantity, total, products(name), sales!inner(warehouse_id)").gte("created_at", from).lte("created_at", to + "T23:59:59");
      if (locationId) q = q.eq("sales.warehouse_id", locationId);
      const { data } = await q;
      const map: Record<string, { name: string; qty: number; revenue: number }> = {};
      (data ?? []).forEach((item: any) => {
        const pid = item.product_id;
        if (!map[pid]) map[pid] = { name: item.products?.name || "Unknown", qty: 0, revenue: 0 };
        map[pid].qty += Number(item.quantity);
        map[pid].revenue += Number(item.total);
      });
      return Object.entries(map).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.qty - a.qty);
    },
  });

  const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2 });

  const exportData = useMemo(() => ({
    columns: ["#", "Product", "Qty Sold", "Revenue"],
    rows: (data ?? []).map((p, i) => [i + 1, p.name, p.qty, fmt(p.revenue)]),
    filename: `trending-products-${from}-to-${to}`,
    title: "Trending Products Report",
  }), [data, from, to]);

  return (
    <div className="space-y-6">
      <PageHeader title="Trending Products" subtitle="Most sold products by quantity" />
      <ReportToolbar from={from} to={to} onFromChange={setFrom} onToChange={setTo}
        showLocationFilter locationId={locationId} onLocationChange={setLocationId}
        exportData={exportData} />
      <div className="print-area space-y-6">
        {isLoading ? <Skeleton className="h-60 w-full" /> : (
          <Card><CardContent className="pt-4">
            <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Qty Sold</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
            <TableBody>{(data ?? []).map((p, i) => (
              <TableRow key={p.id}><TableCell>{i < 3 ? <TrendingUp className="h-4 w-4 text-emerald-600 inline mr-1" /> : null}{i + 1}</TableCell><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-right">{p.qty}</TableCell><TableCell className="text-right">৳ {fmt(p.revenue)}</TableCell></TableRow>
            ))}{(data ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No data</TableCell></TableRow>}</TableBody></Table>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
