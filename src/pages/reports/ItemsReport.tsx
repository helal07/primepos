import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function ItemsReport() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["report_items"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, sku, barcode, stock_quantity, purchase_price, selling_price, alert_quantity, is_active, categories(name), brands(name)").order("name");
      return data ?? [];
    },
  });

  const filtered = (data ?? []).filter((p: any) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase()));
  const fmt = (n: number) => n.toLocaleString("en", { minimumFractionDigits: 2 });
  const totalStock = filtered.reduce((s, p: any) => s + Number(p.stock_quantity), 0);
  const totalValue = filtered.reduce((s, p: any) => s + Number(p.stock_quantity) * Number(p.purchase_price), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Items Report" subtitle="Complete product inventory listing" />
      <div className="flex gap-3 items-center">
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
  );
}
