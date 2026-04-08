import { useState } from "react";
import { useProducts, useProductMutations, useCategories, useBrands, useUnits } from "@/hooks/useInventory";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";

const defaultForm = {
  name: "", sku: "", barcode: "", description: "",
  category_id: "", brand_id: "", unit_id: "",
  purchase_price: "0", selling_price: "0", tax_percent: "0",
  stock_quantity: "0", alert_quantity: "5",
  is_active: true, has_warranty: false,
  warranty_duration: "", warranty_type: "",
  serial_tracking: false,
};

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: units } = useUnits();
  const { create, update, remove } = useProductMutations();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(defaultForm);

  const resetForm = () => { setForm(defaultForm); setEditId(null); };

  const handleSubmit = () => {
    const payload = {
      name: form.name,
      sku: form.sku || null,
      barcode: form.barcode || null,
      description: form.description || null,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      unit_id: form.unit_id || null,
      purchase_price: parseFloat(form.purchase_price) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      tax_percent: parseFloat(form.tax_percent) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      alert_quantity: parseInt(form.alert_quantity) || 5,
      is_active: form.is_active,
      has_warranty: form.has_warranty,
      warranty_duration: form.warranty_duration ? parseInt(form.warranty_duration) : null,
      warranty_type: form.warranty_type || null,
      serial_tracking: form.serial_tracking,
    };

    if (editId) {
      update.mutate({ id: editId, ...payload }, { onSuccess: () => { setOpen(false); resetForm(); } });
    } else {
      create.mutate(payload, { onSuccess: () => { setOpen(false); resetForm(); } });
    }
  };

  const handleEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name, sku: p.sku || "", barcode: p.barcode || "",
      description: p.description || "",
      category_id: p.category_id || "", brand_id: p.brand_id || "", unit_id: p.unit_id || "",
      purchase_price: String(p.purchase_price), selling_price: String(p.selling_price),
      tax_percent: String(p.tax_percent), stock_quantity: String(p.stock_quantity),
      alert_quantity: String(p.alert_quantity), is_active: p.is_active,
      has_warranty: p.has_warranty, warranty_duration: p.warranty_duration ? String(p.warranty_duration) : "",
      warranty_type: p.warranty_type || "", serial_tracking: p.serial_tracking,
    });
    setOpen(true);
  };

  const filtered = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Products" description="Manage your product inventory" />
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or SKU..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Info</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Product Name *</Label>
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
                    </div>
                    <div className="space-y-2">
                      <Label>SKU</Label>
                      <Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated if empty" />
                    </div>
                    <div className="space-y-2">
                      <Label>Barcode</Label>
                      <Input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="Barcode" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Product description" rows={3} />
                  </div>
                </div>

                {/* Classification */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Classification</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {categories?.filter(c => c.is_active).map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Brand</Label>
                      <Select value={form.brand_id} onValueChange={v => setForm({ ...form, brand_id: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {brands?.filter(b => b.is_active).map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Select value={form.unit_id} onValueChange={v => setForm({ ...form, unit_id: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {units?.filter(u => u.is_active).map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.short_name})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pricing & Stock</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Purchase Price</Label>
                      <Input type="number" step="0.01" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Selling Price</Label>
                      <Input type="number" step="0.01" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax %</Label>
                      <Input type="number" step="0.01" value={form.tax_percent} onChange={e => setForm({ ...form, tax_percent: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Stock Qty</Label>
                      <Input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2 max-w-[200px]">
                    <Label>Alert Quantity</Label>
                    <Input type="number" value={form.alert_quantity} onChange={e => setForm({ ...form, alert_quantity: e.target.value })} />
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Options</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                      <Label>Active</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={form.serial_tracking} onCheckedChange={v => setForm({ ...form, serial_tracking: v })} />
                      <Label>Serial Tracking</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={form.has_warranty} onCheckedChange={v => setForm({ ...form, has_warranty: v })} />
                      <Label>Warranty</Label>
                    </div>
                  </div>
                  {form.has_warranty && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Duration (months)</Label>
                        <Input type="number" value={form.warranty_duration} onChange={e => setForm({ ...form, warranty_duration: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={form.warranty_type} onValueChange={v => setForm({ ...form, warranty_type: v })}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manufacturer">Manufacturer</SelectItem>
                            <SelectItem value="seller">Seller</SelectItem>
                            <SelectItem value="extended">Extended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={!form.name || create.isPending || update.isPending}>
                {editId ? "Update" : "Create"} Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
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
              <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No products found</TableCell></TableRow>
            ) : filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground sm:hidden">{p.sku || "No SKU"}</div>
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
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Pencil className="h-4 w-4" /></Button>
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
