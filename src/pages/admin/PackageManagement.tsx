import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePackages, usePackageMutations } from "@/hooks/useSaasAdmin";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PkgForm {
  name: string;
  price: number;
  duration_days: number;
  max_users: number;
  max_business_location: number;
  max_invoice: number;
  features: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

const emptyForm: PkgForm = {
  name: "", price: 0, duration_days: 30, max_users: 1,
  max_business_location: 1, max_invoice: 0, features: "",
  is_popular: false, is_active: true, sort_order: 0,
};

export default function PackageManagement() {
  const { data: packages, isLoading } = usePackages();
  const { create, update, remove } = usePackageMutations();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PkgForm>(emptyForm);

  const openNew = () => { setForm(emptyForm); setEditId(null); setOpen(true); };
  const openEdit = (p: any) => {
    setForm({
      name: p.name, price: p.price, duration_days: p.duration_days,
      max_users: p.max_users, max_business_location: p.max_business_location,
      max_invoice: p.max_invoice,
      features: (p.features as string[])?.join(", ") ?? "",
      is_popular: p.is_popular, is_active: p.is_active, sort_order: p.sort_order,
    });
    setEditId(p.id);
    setOpen(true);
  };

  const handleSave = () => {
    const payload = {
      ...form,
      features: form.features.split(",").map((f) => f.trim()).filter(Boolean),
    };
    if (editId) {
      update.mutate({ id: editId, ...payload }, { onSuccess: () => setOpen(false) });
    } else {
      create.mutate(payload, { onSuccess: () => setOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Package Management" subtitle="Manage subscription plans">
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Package</Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Max Users</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading…</TableCell></TableRow>
              ) : !packages?.length ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No packages</TableCell></TableRow>
              ) : packages.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.name} {p.is_popular && <Star className="inline h-3 w-3 text-yellow-500 ml-1" />}
                  </TableCell>
                  <TableCell>৳{p.price}</TableCell>
                  <TableCell>{p.duration_days} days</TableCell>
                  <TableCell>{p.max_users}</TableCell>
                  <TableCell>{p.max_business_location}</TableCell>
                  <TableCell>{p.max_invoice || "∞"}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "default" : "secondary"}>
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview */}
      {packages && packages.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Landing Page Preview</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {packages.filter((p) => p.is_active).map((p) => (
              <Card key={p.id} className={p.is_popular ? "border-primary ring-2 ring-primary/20" : ""}>
                <CardContent className="p-5 text-center space-y-2">
                  {p.is_popular && <Badge className="mb-1">Popular</Badge>}
                  <h4 className="font-bold text-lg">{p.name}</h4>
                  <p className="text-2xl font-bold">৳{p.price}<span className="text-sm text-muted-foreground">/{p.duration_days}d</span></p>
                  <ul className="text-sm text-left space-y-1">
                    {(p.features as string[])?.map((f, i) => (
                      <li key={i} className="flex items-center gap-1"><span className="text-green-500">✓</span> {f}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Package</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Price (৳)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Duration (days)</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: +e.target.value })} /></div>
              <div><Label>Max Users</Label><Input type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: +e.target.value })} /></div>
              <div><Label>Max Locations</Label><Input type="number" value={form.max_business_location} onChange={(e) => setForm({ ...form, max_business_location: +e.target.value })} /></div>
            </div>
            <div>
              <Label>Max Invoices (0 = unlimited)</Label>
              <Input type="number" value={form.max_invoice} onChange={(e) => setForm({ ...form, max_invoice: +e.target.value })} />
            </div>
            <div>
              <Label>Features (comma-separated)</Label>
              <Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="POS, Inventory, Accounting" />
            </div>
            <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} /></div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.is_popular} onCheckedChange={(v) => setForm({ ...form, is_popular: v })} /><Label>Popular</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || create.isPending || update.isPending}>
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
