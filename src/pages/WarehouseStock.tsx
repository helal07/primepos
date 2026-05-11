import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWarehouses, useWarehouseStock } from "@/hooks/useWarehouses";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Package, AlertTriangle, TrendingUp, Warehouse } from "lucide-react";

export default function WarehouseStock() {
  const [params, setParams] = useSearchParams();
  const warehouseId = params.get("warehouse") || "all";
  const { data: warehouses } = useWarehouses();
  const { data: stock, isLoading } = useWarehouseStock(warehouseId === "all" ? undefined : warehouseId);
  const [search, setSearch] = useState("");

  const setWarehouse = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === "all") next.delete("warehouse"); else next.set("warehouse", v);
    setParams(next, { replace: true });
  };

  const rows = useMemo(() => (stock ?? []).filter((r: any) => {
    const name = r.products?.name?.toLowerCase() ?? "";
    const sku = (r.products?.sku ?? "").toLowerCase();
    const variant = (r.product_variations?.name ?? "").toLowerCase();
    const term = search.toLowerCase();
    return !term || name.includes(term) || sku.includes(term) || variant.includes(term);
  }), [stock, search]);

  const totalUnits = rows.reduce((s, r: any) => s + Number(r.quantity || 0), 0);
  const totalValue = rows.reduce((s, r: any) => s + Number(r.quantity || 0) * Number(r.products?.purchase_price || 0), 0);
  const lowStock = rows.filter((r: any) => r.quantity > 0 && r.quantity <= (r.products?.alert_quantity ?? 0)).length;
  const outOfStock = rows.filter((r: any) => Number(r.quantity) <= 0).length;

  const showWarehouseCol = warehouseId === "all";
  const currentWarehouse = warehouses?.find(w => w.id === warehouseId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Stock"
        description={currentWarehouse ? `Stock on hand at ${currentWarehouse.name}` : "Stock on hand across all warehouses"}
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-muted-foreground" />
          <Select value={warehouseId} onValueChange={setWarehouse}>
            <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouses?.map(w => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}{w.is_default ? " (default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">On Hand</p><p className="text-lg font-bold">{totalUnits.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
          <div><p className="text-xs text-muted-foreground">Stock Value</p><p className="text-lg font-bold">৳{totalValue.toLocaleString()}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
          <div><p className="text-xs text-muted-foreground">Low Stock</p><p className="text-lg font-bold text-amber-600">{lowStock}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><Package className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-xs text-muted-foreground">Out of Stock</p><p className="text-lg font-bold text-destructive">{outOfStock}</p></div>
        </CardContent></Card>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Variation</TableHead>
              <TableHead>SKU</TableHead>
              {showWarehouseCol && <TableHead>Warehouse</TableHead>}
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={showWarehouseCol ? 6 : 5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : !rows.length ? (
              <TableRow><TableCell colSpan={showWarehouseCol ? 6 : 5} className="text-center text-muted-foreground py-8">No stock recorded</TableCell></TableRow>
            ) : rows.map((r: any) => {
              const qty = Number(r.quantity || 0);
              const alert = r.products?.alert_quantity ?? 0;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.products?.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.product_variations?.name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.product_variations?.sku || r.products?.sku || "—"}</TableCell>
                  {showWarehouseCol && <TableCell className="text-sm">{r.warehouses?.name || "—"}</TableCell>}
                  <TableCell className="text-right">
                    {qty <= 0 ? <Badge variant="destructive">0</Badge>
                      : qty <= alert ? <Badge className="bg-amber-500">{qty}</Badge>
                      : <span className="font-medium">{qty}</span>}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">৳{(qty * Number(r.products?.purchase_price || 0)).toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}