import { useState } from "react";
import { useStockTransfers, useStockTransferMutations, useProducts } from "@/hooks/useInventory";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ArrowRightLeft, Check, X } from "lucide-react";

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  completed: "default",
  cancelled: "destructive",
};

export default function StockTransfers() {
  const { data: transfers, isLoading } = useStockTransfers();
  const { data: products } = useProducts();
  const { data: warehouses } = useWarehouses();
  const { create, update } = useStockTransferMutations();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [completeNow, setCompleteNow] = useState(true);
  const [form, setForm] = useState({ product_id: "", from_warehouse_id: "", to_warehouse_id: "", quantity: "1", notes: "" });


  const activeWarehouses = (warehouses ?? []).filter(w => w.is_active);

  const { data: sourceStock } = useQuery({
    queryKey: ["warehouse_stock_check", form.from_warehouse_id, form.product_id],
    enabled: !!form.from_warehouse_id && !!form.product_id,
    queryFn: async () => {
      const rows = await rest.all<{ quantity: number; variation_id: string | null }>("warehouse_stock", {
        filter: { warehouse_id: form.from_warehouse_id, product_id: form.product_id },
        perPage: 100,
      });
      const base = rows.find((r) => !r.variation_id);
      return Number(base?.quantity ?? 0);
    },
  });

  const availableQty = sourceStock ?? 0;
  const requestedQty = parseInt(form.quantity) || 0;
  const insufficientStock = !!form.from_warehouse_id && !!form.product_id && requestedQty > availableQty;

  const handleSubmit = () => {
    const from = activeWarehouses.find(w => w.id === form.from_warehouse_id);
    const to = activeWarehouses.find(w => w.id === form.to_warehouse_id);
    if (!from || !to || from.id === to.id) return;
    if (requestedQty > availableQty) {
      toast({
        title: "Insufficient stock",
        description: `Only ${availableQty} unit(s) available at ${from.name}.`,
        variant: "destructive",
      });
      return;
    }
    create.mutate({
      product_id: form.product_id,
      from_warehouse_id: from.id,
      to_warehouse_id: to.id,
      from_branch: from.name,
      to_branch: to.name,
      quantity: parseInt(form.quantity) || 1,
      notes: form.notes || null,
      status: completeNow ? "completed" : "pending",
      transfer_date: new Date().toISOString().slice(0, 10),
      created_by: user?.id || "",
    } as any, {
      onSuccess: () => {
        setOpen(false);
        setForm({ product_id: "", from_warehouse_id: "", to_warehouse_id: "", quantity: "1", notes: "" });
      },
    });
  };


  return (
    <div className="space-y-6">
      <PageHeader title="Stock Transfers" description="Move stock between warehouses" />
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Transfer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Stock Transfer</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Product *</Label>
                <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Warehouse *</Label>
                  <Select value={form.from_warehouse_id} onValueChange={v => setForm({ ...form, from_warehouse_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                    <SelectContent>
                      {activeWarehouses.map(w => (
                        <SelectItem key={w.id} value={w.id} disabled={w.id === form.to_warehouse_id}>
                          {w.name}{w.is_default ? " (default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Warehouse *</Label>
                  <Select value={form.to_warehouse_id} onValueChange={v => setForm({ ...form, to_warehouse_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                    <SelectContent>
                      {activeWarehouses.map(w => (
                        <SelectItem key={w.id} value={w.id} disabled={w.id === form.from_warehouse_id}>
                          {w.name}{w.is_default ? " (default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                {form.from_warehouse_id && form.product_id && (
                  <p className={`text-xs ${insufficientStock ? "text-destructive" : "text-muted-foreground"}`}>
                    Available at source: <span className="font-medium">{availableQty}</span>
                    {insufficientStock && " — not enough stock"}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" rows={2} />
              </div>
              <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
                <Checkbox checked={completeNow} onCheckedChange={v => setCompleteNow(!!v)} className="mt-0.5" />
                <span>
                  <span className="font-medium">Complete transfer now</span>
                  <span className="block text-xs text-muted-foreground">
                    Stock moves out of the source location and into the destination immediately.
                    Uncheck to save as pending and complete it later.
                  </span>
                </span>
              </label>

            </div>
            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={
                  !form.product_id ||
                  !form.from_warehouse_id ||
                  !form.to_warehouse_id ||
                  form.from_warehouse_id === form.to_warehouse_id ||
                  requestedQty < 1 ||
                  insufficientStock ||
                  create.isPending
                }
              >
                Create Transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>From → To</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : !transfers?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transfers recorded</TableCell></TableRow>
            ) : transfers.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{t.products?.name || "—"}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-sm">
                    {t.from_branch || "—"} <ArrowRightLeft className="h-3 w-3 text-muted-foreground" /> {t.to_branch || "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">{t.quantity}</TableCell>
                <TableCell>
                  <Badge variant={statusColors[t.status] || "secondary"}>{t.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {t.status === "pending" && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => update.mutate({ id: t.id, status: "completed" })} title="Complete">
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => update.mutate({ id: t.id, status: "cancelled" })} title="Cancel">
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
