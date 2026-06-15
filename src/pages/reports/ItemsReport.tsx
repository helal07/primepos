import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ReportToolbar from "@/components/reports/ReportToolbar";

export default function ItemsReport() {
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["report_items", locationId],
    queryFn: async () => {
      if (locationId) {
        const stock = await rest.all<any>("warehouse_stock", {
          filter: { warehouse_id: locationId },
          with: ["product"],
          perPage: 2000,
        });
        return stock.map((r: any) => ({
          ...(r.product ?? {}),
          // Backend Product model doesn't auto-include nested category/brand here;
          // legacy ItemsReport renders "-" when these are missing.
          categories: r.product?.category ?? null,
          brands: r.product?.brand ?? null,
          stock_quantity: Number(r.quantity ?? 0),
        }));
      }
      const rows = await rest.all<any>("products", {
        with: ["category", "brand"], sort: "name", perPage: 2000,
      });
      return rows.map((p: any) => ({ ...p, categories: p.category ?? null, brands: p.brand ?? null }));
    },
  });

  const filtered = (data ?? []).filter((p: any) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase()));
  const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2 });
  const totalStock = filtered.reduce((s, p: any) => s + Number(p.stock_quantity), 0);
  const totalValue = filtered.reduce((s, p: any) => s + Number(p.stock_quantity) * Number(p.purchase_price), 0);

  const exportData = useMemo(() => ({
    columns: ["Product", "SKU", "Category", "Brand", "Stock", "Purchase Price", "Sell Price", "Stock Value"],
    rows: filtered.map((p: any) => [p.name, p.sku || "-", p.categories?.name || "-", p.brands?.name || "-", p.stock_quantity, fmt(Number(p.purchase_price)), fmt(Number(p.selling_price)), fmt(Number(p.stock_quantity) * Number(p.purchase_price))]),
    filename: "items-report",
    title: "Items Report",
  }), [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader title="Items Report" subtitle="Complete product inventory listing" />
      <ReportToolbar showLocationFilter locationId={locationId} onLocationChange={setLocationId} exportData={exportData} />
      <div className="print-area space-y-6">
        <div className="flex gap-3 items-center no-print">
          <Input placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          <span className="text-sm text-muted-foreground">{filtered.length} items</span>
        </div>
        {isLoading ? <Skeleton className="h-60 w-full" /> : (
          <Card><CardContent className="pt-4">
            <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Category</TableHead><TableHead>Brand</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Purchase Price</TableHead><TableHead className="text-right">Sell Price</TableHead><TableHead className="text-right">Stock Value</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((p: any) => {
                const isLow = Number(p.stock_quantity) <= Number(p.alert_quantity);
                return (
                  <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="font-mono text-sm">{p.sku || "-"}</TableCell><TableCell>{p.categories?.name || "-"}</TableCell><TableCell>{p.brands?.name || "-"}</TableCell><TableCell className="text-right">{isLow ? <Badge variant="destructive">{p.stock_quantity}</Badge> : p.stock_quantity}</TableCell><TableCell className="text-right">৳ {fmt(Number(p.purchase_price))}</TableCell><TableCell className="text-right">৳ {fmt(Number(p.selling_price))}</TableCell><TableCell className="text-right">৳ {fmt(Number(p.stock_quantity) * Number(p.purchase_price))}</TableCell></TableRow>
                );
              })}
              <TableRow className="font-bold bg-muted/50"><TableCell colSpan={4}>Total</TableCell><TableCell className="text-right">{totalStock}</TableCell><TableCell colSpan={2}></TableCell><TableCell className="text-right">৳ {fmt(totalValue)}</TableCell></TableRow>
            </TableBody></Table>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
