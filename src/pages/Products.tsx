import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts, useProductMutations } from "@/hooks/useInventory";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";

export default function Products() {
  const navigate = useNavigate();
  const { data: products, isLoading } = useProducts();
  const { remove } = useProductMutations();
  const [search, setSearch] = useState("");

  const filtered = products?.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  const typeBadgeVariant = (type: string) => {
    switch (type) {
      case "imei": return "default";
      case "serial": return "secondary";
      case "combo": return "outline";
      case "service": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Products" description="Manage your product inventory" />
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or SKU..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => navigate("/products/add")}><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="hidden lg:table-cell">Type</TableHead>
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No products found</TableCell></TableRow>
            ) : filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-9 w-9 rounded object-cover border" />
                    ) : (
                      <div className="h-9 w-9 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{p.sku || "No SKU"}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant={typeBadgeVariant(p.product_type || "general")} className="capitalize text-xs">
                    {p.product_type || "general"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{p.sku || "—"}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{p.categories?.name || "—"}</TableCell>
                <TableCell className="text-right font-medium">৳{Number(p.selling_price).toLocaleString()}</TableCell>
                <TableCell className="text-right hidden sm:table-cell">
                  <div className="flex items-center justify-end gap-1">
                    {p.stock_quantity <= p.alert_quantity && <AlertTriangle className="h-3 w-3 text-destructive" />}
                    <span className={p.stock_quantity <= p.alert_quantity ? "text-destructive font-medium" : ""}>{p.stock_quantity}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Draft"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/products/edit/${p.id}`)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
