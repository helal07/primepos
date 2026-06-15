import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, ChevronDown, Pencil, Trash2, PackageCheck } from "lucide-react";
import { usePurchaseOrders } from "@/hooks/usePurchases";
import { rest } from "@/lib/restResource";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Can } from "@/components/Can";

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: orders, isLoading } = usePurchaseOrders();
  const [search, setSearch] = useState("");

  const filtered = (orders ?? []).filter((o: any) =>
    o.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.suppliers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this purchase order?")) return;
    try {
      await rest.remove("purchase_orders", id);
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["purchase_orders"] });
    toast.success("Purchase order deleted");
  };

  const handleReceive = async (id: string, status: string) => {
    if (status === "received") { toast.info("Already received"); return; }
    if (!confirm("Mark this purchase order as Received and add items to inventory?")) return;
    try {
      const items = await rest.all<{ product_id: string; quantity: number }>("purchase_order_items", {
        filter: { purchase_order_id: id }, perPage: 2000,
      });
      if (!items || items.length === 0) {
        toast.error("No items to receive");
        return;
      }
      // Aggregate quantities per product
      const byProduct = new Map<string, number>();
      for (const it of items) {
        byProduct.set(it.product_id, (byProduct.get(it.product_id) || 0) + Number(it.quantity || 0));
      }
      for (const [productId, qty] of byProduct) {
        const { data: product, error: pErr } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", productId)
          .single();
        if (pErr) throw pErr;
        const { error: uErr } = await supabase
          .from("products")
          .update({ stock_quantity: Number(product?.stock_quantity || 0) + qty })
          .eq("id", productId);
        if (uErr) throw uErr;
      }
      const { error: sErr } = await supabase
        .from("purchase_orders")
        .update({ status: "received" })
        .eq("id", id);
      if (sErr) throw sErr;
      await qc.invalidateQueries({ queryKey: ["purchase_orders"] });
      await qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Purchase order received and inventory updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to receive purchase order");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchase Orders"
        description="Manage purchase orders"
        actions={
          <Can module="purchases" action="create">
            <Button onClick={() => navigate("/purchase-orders/add")}>
              <Plus className="h-4 w-4 mr-2" /> Add Purchase Order
            </Button>
          </Can>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Action</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No purchase orders found</TableCell></TableRow>
              ) : (
                filtered.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            Actions <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => navigate(`/purchase-orders/add?edit=${o.id}`)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={o.status === "received"}
                            onClick={() => handleReceive(o.id, o.status)}
                          >
                            <PackageCheck className="h-4 w-4 mr-2" /> Receive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(o.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="font-medium">{o.reference_number || "—"}</TableCell>
                    <TableCell>{o.suppliers?.name || "—"}</TableCell>
                    <TableCell>{new Date(o.order_date).toLocaleDateString()}</TableCell>
                    <TableCell>{o.expected_date ? new Date(o.expected_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell><Badge variant={o.status === "approved" ? "default" : "outline"}>{o.status}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
