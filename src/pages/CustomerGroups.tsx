import { useState } from "react";
import { useCustomerGroups, useCustomerGroupMutations, useSellingPriceGroups } from "@/hooks/usePriceGroups";
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

const NONE = "__none__";

export default function CustomerGroups() {
  const { data, isLoading } = useCustomerGroups();
  const { data: priceGroups } = useSellingPriceGroups();
  const { create, update, remove } = useCustomerGroupMutations();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", description: "", selling_price_group_id: NONE, is_active: true });

  const resetForm = () => { setForm({ name: "", description: "", selling_price_group_id: NONE, is_active: true }); setEditId(null); };

  const handleSubmit = () => {
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      selling_price_group_id: form.selling_price_group_id === NONE ? null : form.selling_price_group_id,
      is_active: form.is_active,
    };
    if (editId) update.mutate({ id: editId, ...payload }, { onSuccess: () => { setOpen(false); resetForm(); } });
    else create.mutate(payload as any, { onSuccess: () => { setOpen(false); resetForm(); } });
  };

  const handleEdit = (g: any) => {
    setEditId(g.id);
    setForm({
      name: g.name,
      description: g.description || "",
      selling_price_group_id: g.selling_price_group_id || NONE,
      is_active: g.is_active,
    });
    setOpen(true);
  };

  const filtered = data?.filter(g => g.name.toLowerCase().includes(search.toLowerCase())) || [];
  const priceGroupName = (id?: string | null) => priceGroups?.find(p => p.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <PageHeader title="Customer Groups" description="Group customers and assign each group to a selling price tier." />
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customer groups..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Customer Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Customer Group</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wholesale Buyers" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Selling Price Group</Label>
                <Select value={form.selling_price_group_id} onValueChange={v => setForm({ ...form, selling_price_group_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None (use default price)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None (default price)</SelectItem>
                    {priceGroups?.filter(p => p.is_active).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={!form.name.trim() || create.isPending || update.isPending}>
                {editId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Description</TableHead>
              <TableHead>Price Group</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No customer groups yet</TableCell></TableRow>
            ) : filtered.map(g => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{g.description || "—"}</TableCell>
                <TableCell>{priceGroupName(g.selling_price_group_id)}</TableCell>
                <TableCell><Badge variant={g.is_active ? "default" : "secondary"}>{g.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(g)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}