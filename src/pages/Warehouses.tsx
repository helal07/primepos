import { useState } from "react";
import { useWarehouses, useWarehouseMutations } from "@/hooks/useWarehouses";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Warehouse, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Wh = Tables<"warehouses">;

const empty = { name: "", code: "", address: "", phone: "", contact_person: "", is_active: true, is_default: false };

export default function Warehouses() {
  const { data, isLoading } = useWarehouses();
  const { create, update, remove } = useWarehouseMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Wh | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);

  const startCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (w: Wh) => {
    setEditing(w);
    setForm({
      name: w.name, code: w.code ?? "", address: w.address ?? "",
      phone: w.phone ?? "", contact_person: w.contact_person ?? "",
      is_active: w.is_active, is_default: w.is_default,
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    const payload = { ...form, code: form.code || null, address: form.address || null, phone: form.phone || null, contact_person: form.contact_person || null };
    if (editing) {
      update.mutate({ id: editing.id, ...payload }, { onSuccess: () => setOpen(false) });
    } else {
      create.mutate(payload as any, { onSuccess: () => setOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouses" description="Manage stock locations across your business" />
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={startCreate}><Plus className="mr-2 h-4 w-4" /> New Warehouse</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Warehouse" : "New Warehouse"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Warehouse" />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Code</Label>
                  <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="MAIN" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_default} onCheckedChange={v => setForm({ ...form, is_default: v })} disabled={editing?.is_default} />
                  <Label>Default</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={!form.name || create.isPending || update.isPending}>
                {editing ? "Save changes" : "Create warehouse"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : !data?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No warehouses yet</TableCell></TableRow>
            ) : data.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-muted-foreground" /> {w.name}
                  {w.is_default && <Badge variant="secondary" className="ml-1">Default</Badge>}
                </TableCell>
                <TableCell className="text-muted-foreground">{w.code || "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  <div>{w.contact_person || "—"}</div>
                  <div className="text-xs text-muted-foreground">{w.phone || ""}</div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[260px] truncate">{w.address || "—"}</TableCell>
                <TableCell>
                  <Badge variant={w.is_active ? "default" : "secondary"}>{w.is_active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="icon" title="View stock">
                    <Link to={`/warehouses/stock?warehouse=${w.id}`}><Eye className="h-4 w-4" /></Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(w)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                  {!w.is_default && (
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete ${w.name}?`)) remove.mutate(w.id); }} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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