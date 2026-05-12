import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePackages, usePackageMutations } from "@/hooks/useSaasAdmin";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MODULE_CATALOG, DEFAULT_MODULES, type ModuleKey } from "@/lib/modules";

interface PkgForm {
  name: string; price: number; duration_days: number; max_users: number;
  max_business_location: number; max_invoice: number; features: string;
  is_popular: boolean; is_active: boolean; sort_order: number;
  enabled_modules: ModuleKey[];
}

const emptyForm: PkgForm = {
  name: "", price: 0, duration_days: 30, max_users: 1,
  max_business_location: 1, max_invoice: 0, features: "",
  is_popular: false, is_active: true, sort_order: 0,
  enabled_modules: [...DEFAULT_MODULES],
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
      enabled_modules: ((p.enabled_modules as ModuleKey[]) ?? [...DEFAULT_MODULES]),
    });
    setEditId(p.id); setOpen(true);
  };

  const handleSave = () => {
    const payload = {
      ...form,
      features: form.features.split(",").map((f) => f.trim()).filter(Boolean),
    } as any;
    if (editId) update.mutate({ id: editId, ...payload }, { onSuccess: () => setOpen(false) });
    else create.mutate(payload, { onSuccess: () => setOpen(false) });
  };

  const toggleModule = (k: ModuleKey) =>
    setForm((f) => ({
      ...f,
      enabled_modules: f.enabled_modules.includes(k)
        ? f.enabled_modules.filter((m) => m !== k)
        : [...f.enabled_modules, k],
    }));

  return (
    <div className="space-y-6">
      <PageHeader title="Package Management" subtitle="Manage subscription plans">
        <Button onClick={openNew} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="h-4 w-4 mr-1" /> Add Package</Button>
      </PageHeader>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 bg-slate-900">
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">Price</TableHead>
              <TableHead className="text-slate-400">Duration</TableHead>
              <TableHead className="text-slate-400">Max Users</TableHead>
              <TableHead className="text-slate-400">Locations</TableHead>
              <TableHead className="text-slate-400">Invoices</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-right text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Loading…</TableCell></TableRow>
            ) : !packages?.length ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">No packages</TableCell></TableRow>
            ) : packages.map((p) => (
              <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/50">
                <TableCell className="font-medium text-white">
                  {p.name} {p.is_popular && <Star className="inline h-3 w-3 text-yellow-500 ml-1" />}
                </TableCell>
                <TableCell className="text-slate-300">৳{p.price}</TableCell>
                <TableCell className="text-slate-300">{p.duration_days} days</TableCell>
                <TableCell className="text-slate-300">{p.max_users}</TableCell>
                <TableCell className="text-slate-300">{p.max_business_location}</TableCell>
                <TableCell className="text-slate-300">{p.max_invoice || "∞"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={p.is_active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-slate-700 text-slate-400 border-slate-600"}>
                    {p.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Preview */}
      {packages && packages.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Landing Page Preview</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {packages.filter((p) => p.is_active).map((p) => (
              <div key={p.id} className={`rounded-xl border p-5 text-center space-y-2 ${p.is_popular ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-slate-800" : "border-slate-800 bg-slate-900/50"}`}>
                {p.is_popular && <Badge className="bg-emerald-600 text-white mb-1">Popular</Badge>}
                <h4 className="font-bold text-lg text-white">{p.name}</h4>
                <p className="text-2xl font-bold text-white">৳{p.price}<span className="text-sm text-slate-400">/{p.duration_days}d</span></p>
                <ul className="text-sm text-left space-y-1">
                  {(p.features as string[])?.map((f, i) => (
                    <li key={i} className="flex items-center gap-1 text-slate-300"><span className="text-emerald-400">✓</span> {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col bg-slate-900 border-slate-800 text-white">
          <DialogHeader><DialogTitle className="text-white">{editId ? "Edit" : "Add"} Package</DialogTitle></DialogHeader>
          <div className="grid gap-4 flex-1 overflow-y-auto -mx-6 px-6">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Name</Label><Input className="bg-slate-800 border-slate-700 text-white" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label className="text-slate-300">Price (৳)</Label><Input className="bg-slate-800 border-slate-700 text-white" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-slate-300">Duration (days)</Label><Input className="bg-slate-800 border-slate-700 text-white" type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: +e.target.value })} /></div>
              <div><Label className="text-slate-300">Max Users</Label><Input className="bg-slate-800 border-slate-700 text-white" type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: +e.target.value })} /></div>
              <div><Label className="text-slate-300">Max Locations</Label><Input className="bg-slate-800 border-slate-700 text-white" type="number" value={form.max_business_location} onChange={(e) => setForm({ ...form, max_business_location: +e.target.value })} /></div>
            </div>
            <div><Label className="text-slate-300">Max Invoices (0 = unlimited)</Label><Input className="bg-slate-800 border-slate-700 text-white" type="number" value={form.max_invoice} onChange={(e) => setForm({ ...form, max_invoice: +e.target.value })} /></div>
            <div><Label className="text-slate-300">Features (comma-separated)</Label><Input className="bg-slate-800 border-slate-700 text-white" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="POS, Inventory, Accounting" /></div>
            <div>
              <Label className="text-slate-300">Enabled Modules</Label>
              <p className="text-xs text-slate-500 mb-2">Tenants on this plan will only see the ticked modules.</p>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-auto rounded border border-slate-700 p-2">
                {MODULE_CATALOG.map((m) => (
                  <label key={m.key} className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                    <Checkbox
                      checked={form.enabled_modules.includes(m.key)}
                      onCheckedChange={() => toggleModule(m.key)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-slate-200">{m.label}</span>
                      <span className="block text-slate-500 leading-tight">{m.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div><Label className="text-slate-300">Sort Order</Label><Input className="bg-slate-800 border-slate-700 text-white" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} /></div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Switch checked={form.is_popular} onCheckedChange={(v) => setForm({ ...form, is_popular: v })} /><Label className="text-slate-300">Popular</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label className="text-slate-300">Active</Label></div>
            </div>
          </div>
          <DialogFooter className="border-t border-slate-800 pt-4">
            <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={!form.name || create.isPending || update.isPending}>
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
