import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Package, AlertTriangle, TrendingUp } from "lucide-react";

export default function StockReport() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["report_stock"],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, sku, stock_quantity, purchase_price, selling_price, alert_quantity, categories(name), brands(name)")
        .order("stock_quantity");
      if (error) throw error;
      return products ?? [];
    },
  });

  const filtered = (data ?? []).filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalStock = (data ?? []).reduce((s, p: any) => s + Number(p.stock_quantity), 0);
  const totalValue = (data ?? []).reduce((s, p: any) => s + Number(p.stock_quantity) * Number(p.purchase_price), 0);
  const lowStockCount = (data ?? []).filter((p: any) => p.stock_quantity <= p.alert_quantity).length;
  const outOfStockCount = (data ?? []).filter((p: any) => p.stock_quantity <= 0).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Report" description="Current inventory levels and valuation" />

      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="h-5 w-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">Total Units</p><p className="text-lg font-bold">{totalStock.toLocaleString()}</p></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
              <div><p className="text-xs text-muted-foreground">Stock Value</p><p className="text-lg font-bold">৳{totalValue.toLocaleString()}</p></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
              <div><p className="text-xs text-muted-foreground">Low Stock</p><p className="text-lg font-bold text-amber-600">{lowStockCount}</p></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><Package className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-xs text-muted-foreground">Out of Stock</p><p className="text-lg font-bold text-destructive">{outOfStockCount}</p></div>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Stock Details</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Purchase Price</TableHead>
                      <TableHead className="text-right">Sell Price</TableHead>
                      <TableHead className="text-right">Stock Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground">{p.sku || "—"}</TableCell>
                        <TableCell>{(p.categories as any)?.name || "—"}</TableCell>
                        <TableCell className="text-right">
                          {p.stock_quantity <= 0 ? (
                            <Badge variant="destructive">0</Badge>
                          ) : p.stock_quantity <= p.alert_quantity ? (
                            <Badge className="bg-amber-500">{p.stock_quantity}</Badge>
                          ) : (
                            <span className="font-medium">{p.stock_quantity}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">৳{Number(p.purchase_price).toLocaleString()}</TableCell>
                        <TableCell className="text-right">৳{Number(p.selling_price).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">৳{(p.stock_quantity * Number(p.purchase_price)).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
