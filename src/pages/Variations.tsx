import { useState } from "react";
import { useVariations, useVariationMutations, useProducts } from "@/hooks/useInventory";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

const defaultForm = { product_id: "", name: "", sku: "", barcode: "", purchase_price: "0", selling_price: "0", stock_quantity: "0", alert_quantity: "5", is_active: true };

export default function Variations() {
  const { data: variations, isLoading } = useVariations();
  const { data: products } = useProducts();
  const { create, update, remove } = useVariationMutations();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(defaultForm);

  const resetForm = () => { setForm(defaultForm); setEditId(null); };

  const handleSubmit = () => {
    const payload = {
      product_id: form.product_id,
      name: form.name,
      sku: form.sku || null,
      barcode: form.barcode || null,
      purchase_price: parseFloat(form.purchase_price) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      alert_quantity: parseInt(form.alert_quantity) || 5,
      is_active: form.is_active,
    };
    if (editId) {
      update.mutate({ id: editId, ...payload }, { onSuccess: () => { setOpen(false); resetForm(); } });
    } else {
      create.mutate(payload, { onSuccess: () => { setOpen(false); resetForm(); } });
    }
  };

  const handleEdit = (v: any) => {
    setEditId(v.id);
    setForm({
      product_id: v.product_id, name: v.name, sku: v.sku || "", barcode: v.barcode || "",
      purchase_price: String(v.purchase_price), selling_price: String(v.selling_price),
      stock_quantity: String(v.stock_quantity), alert_quantity: String(v.alert_quantity), is_active: v.is_active,
    });
    setOpen(true);
  };

  const filtered = variations?.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) || (v.sku && v.sku.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Variations" description="Manage product variations (size, color, etc.)" />
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search variations..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Variation</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Variation</DialogTitle></DialogHeader>
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
              <div className="space-y-2">
                <Label>Variation Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Red / XL / 128GB" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
                <div className="space-y-2"><Label>Barcode</Label><Input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Purchase Price</Label><Input type="number" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} /></div>
                <div className="space-y-2"><Label>Selling Price</Label><Input type="number" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Stock Qty</Label><Input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} /></div>
                <div className="space-y-2"><Label>Alert Qty</Label><Input type="number" value={form.alert_quantity} onChange={e => setForm({ ...form, alert_quantity: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={!form.name || !form.product_id || create.isPending || update.isPending}>
                {editId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variation</TableHead>
              <TableHead className="hidden sm:table-cell">Product</TableHead>
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No variations found</TableCell></TableRow>
            ) : filtered.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{v.products?.name || "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{v.sku || "—"}</TableCell>
                <TableCell className="text-right font-medium">৳{Number(v.selling_price).toLocaleString()}</TableCell>
                <TableCell className="text-right hidden sm:table-cell">{v.stock_quantity}</TableCell>
                <TableCell><Badge variant={v.is_active ? "default" : "secondary"}>{v.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(v)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
