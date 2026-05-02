import { useState } from "react";
import { useSuppliers, useSupplierMutations } from "@/hooks/useContacts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Search, ChevronDown, Eye, Power, BookOpen, ShoppingBag, FileText, CreditCard, Filter, Printer, FileSpreadsheet } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const defaultForm = { name: "", phone: "", email: "", address: "", company: "", tax_number: "", notes: "", is_active: true };

export default function Suppliers() {
  const navigate = useNavigate();
  const { data: suppliers, isLoading } = useSuppliers();
  const { create, update, remove } = useSupplierMutations();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [perPage, setPerPage] = useState("25");
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
      notes: form.notes || null,
      is_active: form.is_active,
    };
    if (editId) {
      update.mutate({ id: editId, ...payload }, { onSuccess: () => { setOpen(false); resetForm(); } });
    } else {
      create.mutate(payload, { onSuccess: () => { setOpen(false); resetForm(); } });
    }
  };

  const handleEdit = (s: any) => {
    setEditId(s.id);
    setForm({
      name: s.name, phone: s.phone || "", email: s.email || "",
      address: s.address || "", company: s.company || "",
      tax_number: s.tax_number || "", notes: s.notes || "", is_active: s.is_active,
    });
    setOpen(true);
  };

  const filtered = (suppliers ?? []).filter((s: any) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(search)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.company && s.company.toLowerCase().includes(q));
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.is_active) ||
      (statusFilter === "inactive" && !s.is_active);
    return matchesSearch && matchesStatus;
  });

  const contactId = (s: any) => s.contact_id || `SU${String(s.id).slice(0, 4).toUpperCase()}`;

  const handleExportCSV = () => {
    const headers = ["Contact ID", "Business Name", "Name", "Email", "Tax number", "Opening Balance", "Address", "Mobile", "Total Purchase Due"];
    const rows = filtered.map((s: any) => [
      contactId(s), s.company || "", s.name, s.email || "", s.tax_number || "",
      s.balance ?? 0, (s.address || "").replace(/[\r\n,]+/g, " "), s.phone || "", s.balance ?? 0,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "suppliers.csv"; a.click();
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description="Manage your Suppliers" />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Name, phone, email, company..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Supplier</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Supplier name" />
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
                {editId ? "Update" : "Create"} Supplier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">All your Suppliers</CardTitle>
          <Button onClick={() => { resetForm(); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={perPage} onValueChange={setPerPage}>
                <SelectTrigger className="w-[80px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 mr-1" /> Print
              </Button>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-[180px]" />
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[110px]">Action</TableHead>
                  <TableHead>Contact ID</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tax number</TableHead>
                  <TableHead className="text-right">Opening Balance</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="text-right">Total Purchase Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                )) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No suppliers found</TableCell></TableRow>
                ) : filtered.slice(0, Number(perPage)).map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            Actions <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <DropdownMenuItem onClick={() => navigate(`/suppliers/${s.id}?action=pay`)}>
                            <CreditCard className="h-4 w-4 mr-2" /> Pay
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/suppliers/${s.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(s)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { if (confirm("Delete this supplier?")) remove.mutate(s.id); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => update.mutate({ id: s.id, is_active: !s.is_active })}>
                            <Power className="h-4 w-4 mr-2" />
                            {s.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/suppliers/${s.id}#ledger`)}>
                            <BookOpen className="h-4 w-4 mr-2" /> Ledger
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/suppliers/${s.id}#purchases`)}>
                            <ShoppingBag className="h-4 w-4 mr-2" /> Purchases
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/suppliers/${s.id}#documents`)}>
                            <FileText className="h-4 w-4 mr-2" /> Documents &amp; Note
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{contactId(s)}</TableCell>
                    <TableCell>{s.company || "—"}</TableCell>
                    <TableCell>
                      <Link to={`/suppliers/${s.id}`} className="font-medium text-primary hover:underline">{s.name}</Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.tax_number || "—"}</TableCell>
                    <TableCell className="text-right">৳{Number(s.balance || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{s.address || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.phone || "—"}</TableCell>
                    <TableCell className="text-right">৳{Number(s.balance || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground mt-3">
            Showing 1 to {Math.min(Number(perPage), filtered.length)} of {filtered.length} entries
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
