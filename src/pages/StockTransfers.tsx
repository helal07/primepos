import { useState } from "react";
import { useStockTransfers, useStockTransferMutations, useProducts } from "@/hooks/useInventory";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  const { create, update } = useStockTransferMutations();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: "", from_branch: "Main", to_branch: "", quantity: "1", notes: "" });

  const handleSubmit = () => {
    create.mutate({
      product_id: form.product_id,
      from_branch: form.from_branch,
      to_branch: form.to_branch,
      quantity: parseInt(form.quantity) || 1,
      notes: form.notes || null,
      created_by: user?.id || "",
    }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ product_id: "", from_branch: "Main", to_branch: "", quantity: "1", notes: "" });
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Transfers" description="Transfer stock between branches" />
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
                  <Label>From Branch</Label>
                  <Input value={form.from_branch} onChange={e => setForm({ ...form, from_branch: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>To Branch *</Label>
                  <Input value={form.to_branch} onChange={e => setForm({ ...form, to_branch: e.target.value })} placeholder="Branch name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={!form.product_id || !form.to_branch || create.isPending}>
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
                    {t.from_branch} <ArrowRightLeft className="h-3 w-3 text-muted-foreground" /> {t.to_branch}
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
