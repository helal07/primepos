import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useTenants, useTenantMutations, usePackages } from "@/hooks/useSaasAdmin";
import { Plus, MoreVertical, Search, CalendarPlus, Ban, CheckCircle, Trash2, Pencil } from "lucide-react";

interface TenantForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  owner_user_id: string;
  package_id: string;
  subscription_start: string;
  subscription_end: string;
  status: string;
  notes: string;
}

const emptyForm: TenantForm = {
  name: "", phone: "", email: "", address: "",
  owner_user_id: "", package_id: "", subscription_start: new Date().toISOString().split("T")[0],
  subscription_end: "", status: "trial", notes: "",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trial: "bg-yellow-100 text-yellow-700",
  suspended: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-700",
};

export default function TenantManagement() {
  const { data: tenants, isLoading } = useTenants();
  const { data: packages } = usePackages();
  const { create, update, remove, suspend, activate, extend } = useTenantMutations();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendId, setExtendId] = useState("");
  const [extendDays, setExtendDays] = useState(30);

  const filtered = tenants?.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (t.phone ?? "").includes(search)
  );

  const openNew = () => { setForm(emptyForm); setEditId(null); setOpen(true); };
  const openEdit = (t: any) => {
    setForm({
      name: t.name, phone: t.phone ?? "", email: t.email ?? "", address: t.address ?? "",
      owner_user_id: t.owner_user_id, package_id: t.package_id ?? "",
      subscription_start: t.subscription_start ?? "", subscription_end: t.subscription_end ?? "",
      status: t.status, notes: t.notes ?? "",
    });
    setEditId(t.id);
    setOpen(true);
  };

  const handleSave = () => {
    const payload: any = { ...form };
    if (!payload.package_id) delete payload.package_id;
    if (!payload.subscription_end) delete payload.subscription_end;

    if (editId) {
      update.mutate({ id: editId, ...payload }, { onSuccess: () => setOpen(false) });
    } else {
      create.mutate(payload, { onSuccess: () => setOpen(false) });
    }
  };

  const daysLeft = (end: string | null) => {
    if (!end) return "—";
    const diff = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
    return diff > 0 ? `${diff}d` : "Expired";
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tenant Management" subtitle="Manage all business tenants">
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Tenant</Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tenants..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading…</TableCell></TableRow>
              ) : !filtered?.length ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tenants found</TableCell></TableRow>
              ) : filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{t.phone ?? "—"}</TableCell>
                  <TableCell>{(t as any).saas_packages?.name ?? "—"}</TableCell>
                  <TableCell>{daysLeft(t.subscription_end)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[t.status] ?? ""}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setExtendId(t.id); setExtendDays(30); setExtendOpen(true); }}>
                          <CalendarPlus className="h-4 w-4 mr-2" /> Extend Period
                        </DropdownMenuItem>
                        {t.status !== "suspended" ? (
                          <DropdownMenuItem onClick={() => suspend.mutate(t.id)}>
                            <Ban className="h-4 w-4 mr-2" /> Suspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => activate.mutate(t.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => remove.mutate(t.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Tenant</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Business Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Owner User ID</Label><Input value={form.owner_user_id} onChange={(e) => setForm({ ...form, owner_user_id: e.target.value })} placeholder="UUID of the owner user" /></div>
            <div>
              <Label>Package</Label>
              <Select value={form.package_id} onValueChange={(v) => setForm({ ...form, package_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                <SelectContent>
                  {packages?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — ৳{p.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.subscription_start} onChange={(e) => setForm({ ...form, subscription_start: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.subscription_end} onChange={(e) => setForm({ ...form, subscription_end: e.target.value })} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.owner_user_id}>
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Extend Subscription</DialogTitle></DialogHeader>
          <div>
            <Label>Days to add</Label>
            <Input type="number" value={extendDays} onChange={(e) => setExtendDays(+e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>Cancel</Button>
            <Button onClick={() => extend.mutate({ id: extendId, days: extendDays }, { onSuccess: () => setExtendOpen(false) })}>
              Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
