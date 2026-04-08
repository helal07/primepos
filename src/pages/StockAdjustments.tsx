import { useState } from "react";
import { useStockAdjustments, useStockAdjustmentMutations, useProducts } from "@/hooks/useInventory";
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
import { Plus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

export default function StockAdjustments() {
  const { data: adjustments, isLoading } = useStockAdjustments();
  const { data: products } = useProducts();
  const { create } = useStockAdjustmentMutations();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: "", type: "addition", quantity_change: "0", reason: "", notes: "" });

  const handleSubmit = () => {
    create.mutate({
      product_id: form.product_id,
      type: form.type,
      quantity_change: parseInt(form.quantity_change) || 0,
      reason: form.reason,
      notes: form.notes || null,
      adjusted_by: user?.id || "",
    }, {
      onSuccess: () => {
        setOpen(false);
        setForm({ product_id: "", type: "addition", quantity_change: "0", reason: "", notes: "" });
      },
    });
  };

  const reasons = ["Purchase", "Return", "Damage", "Theft", "Correction", "Opening Stock", "Other"];

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Adjustments" description="Track and record inventory changes" />
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Adjustment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Stock Adjustment</DialogTitle></DialogHeader>
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
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="addition">Addition (+)</SelectItem>
                      <SelectItem value="subtraction">Subtraction (−)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input type="number" min="1" value={form.quantity_change} onChange={e => setForm({ ...form, quantity_change: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select value={form.reason} onValueChange={v => setForm({ ...form, reason: v })}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {reasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={!form.product_id || !form.reason || create.isPending}>
                Save Adjustment
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
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="hidden sm:table-cell">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : !adjustments?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No adjustments recorded</TableCell></TableRow>
            ) : adjustments.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{a.products?.name || "—"}</TableCell>
                <TableCell>
                  <Badge variant={a.type === "addition" ? "default" : "destructive"} className="gap-1">
                    {a.type === "addition" ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                    {a.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{a.type === "addition" ? "+" : "−"}{a.quantity_change}</TableCell>
                <TableCell>{a.reason}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{a.notes || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
