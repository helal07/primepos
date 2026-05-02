import { useState } from "react";
import { useCustomers, useCustomerMutations } from "@/hooks/useContacts";
import { useCustomerGroups } from "@/hooks/usePriceGroups";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Link } from "react-router-dom";

const NONE = "__none__";
const defaultForm = { name: "", phone: "", email: "", address: "", company: "", tax_number: "", credit_limit: "", customer_group_id: NONE, notes: "", is_active: true };

export default function Customers() {
  const { data: customers, isLoading } = useCustomers();
  const { data: customerGroups } = useCustomerGroups();
  const { create, update, remove } = useCustomerMutations();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(defaultForm);

  const resetForm = () => { setForm(defaultForm); setEditId(null); };

  const handleSubmit = () => {
    const payload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      company: form.company || null,
      tax_number: form.tax_number || null,
      credit_limit: form.credit_limit === "" ? null : Number(form.credit_limit),
      customer_group_id: form.customer_group_id === NONE ? null : form.customer_group_id,
      notes: form.notes || null,
      is_active: form.is_active,
    };
    if (editId) {
      update.mutate({ id: editId, ...payload }, { onSuccess: () => { setOpen(false); resetForm(); } });
    } else {
      create.mutate(payload, { onSuccess: () => { setOpen(false); resetForm(); } });
    }
  };

  const handleEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      name: c.name, phone: c.phone || "", email: c.email || "",
      address: c.address || "", company: c.company || "",
      tax_number: c.tax_number || "",
      credit_limit: c.credit_limit == null ? "" : String(c.credit_limit),
      customer_group_id: c.customer_group_id || NONE,
      notes: c.notes || "", is_active: c.is_active,
    });
    setOpen(true);
  };

  const filtered = customers?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="Manage your customer database" />
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Customer</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Customer</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Customer name" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+880..." />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
                </div>
                <div className="space-y-2">
                  <Label>Tax Number</Label>
                  <Input value={form.tax_number} onChange={e => setForm({ ...form, tax_number: e.target.value })} placeholder="TIN / VAT" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Credit Limit</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.credit_limit}
                    onChange={e => setForm({ ...form, credit_limit: e.target.value })}
                    placeholder="e.g. 50000"
                  />
                  <p className="text-xs text-muted-foreground">Keep blank for no limit</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Customer Group</Label>
                  <Select value={form.customer_group_id} onValueChange={v => setForm({ ...form, customer_group_id: v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None (default price)</SelectItem>
                      {customerGroups?.filter(g => g.is_active).map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Determines which selling price tier applies at POS / Sale.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address" rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes" rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={!form.name || create.isPending || update.isPending}>
                {editId ? "Update" : "Create"} Customer
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
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Balance</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Credit Limit</TableHead>
              <TableHead className="text-right hidden md:table-cell">Purchases</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            )) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No customers found</TableCell></TableRow>
            ) : filtered.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link to={`/customers/${c.id}`} className="font-medium text-primary hover:underline">{c.name}</Link>
                  {c.company && <div className="text-xs text-muted-foreground">{c.company}</div>}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">{c.phone || "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{c.email || "—"}</TableCell>
                <TableCell className="text-right hidden sm:table-cell font-medium">৳{Number(c.balance).toLocaleString()}</TableCell>
                <TableCell className="text-right hidden lg:table-cell text-muted-foreground">
                  {c.credit_limit == null ? "—" : `৳${Number(c.credit_limit).toLocaleString()}`}
                </TableCell>
                <TableCell className="text-right hidden md:table-cell">{c.total_purchases}</TableCell>
                <TableCell>
                  <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
