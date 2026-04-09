import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useTenants, useTenantMutations, usePackages } from "@/hooks/useSaasAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, MoreVertical, Search, CalendarPlus, Ban, CheckCircle, Trash2, Pencil,
  FileSpreadsheet, FileText, Printer, Download, KeyRound, Eye
} from "lucide-react";

interface TenantForm {
  // Admin account
  admin_display_name: string;
  admin_email: string;
  admin_password: string;
  // Business info
  name: string;
  company_name: string;
  phone: string;
  email: string;
  address: string;
  domain: string;
  // Subscription
  package_id: string;
  subscription_type: string;
  subscription_start: string;
  subscription_end: string;
  status: string;
  notes: string;
  // Payment
  payment_method: string;
  payment_amount: string;
}

const emptyForm: TenantForm = {
  admin_display_name: "", admin_email: "", admin_password: "",
  name: "", company_name: "", phone: "", email: "", address: "", domain: "",
  package_id: "", subscription_type: "monthly",
  subscription_start: new Date().toISOString().split("T")[0],
  subscription_end: "", status: "trial", notes: "",
  payment_method: "manual", payment_amount: "",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  trial: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function TenantManagement() {
  const { data: tenants, isLoading } = useTenants();
  const { data: packages } = usePackages();
  const { update, remove, suspend, activate, extend } = useTenantMutations();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterPackage, setFilterPackage] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [perPage, setPerPage] = useState(25);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendId, setExtendId] = useState("");
  const [extendDays, setExtendDays] = useState(30);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = tenants?.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.phone ?? "").includes(search) ||
      ((t as any).company_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchPkg = filterPackage === "all" || t.package_id === filterPackage;
    const matchType = filterType === "all" || (t as any).subscription_type === filterType;
    return matchSearch && matchPkg && matchType;
  })?.slice(0, perPage);

  const openNew = () => { setForm(emptyForm); setEditId(null); setOpen(true); };
  const openEdit = (t: any) => {
    setForm({
      admin_display_name: "", admin_email: "", admin_password: "",
      name: t.name, company_name: t.company_name ?? "", phone: t.phone ?? "",
      email: t.email ?? "", address: t.address ?? "", domain: t.domain ?? "",
      package_id: t.package_id ?? "", subscription_type: t.subscription_type ?? "monthly",
      subscription_start: t.subscription_start ?? "", subscription_end: t.subscription_end ?? "",
      status: t.status, notes: t.notes ?? "",
      payment_method: "manual", payment_amount: "",
    });
    setEditId(t.id);
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        const payload: any = {
          name: form.name, company_name: form.company_name, phone: form.phone,
          email: form.email, address: form.address, domain: form.domain,
          package_id: form.package_id || null, subscription_type: form.subscription_type,
          subscription_start: form.subscription_start,
          subscription_end: form.subscription_end || null,
          status: form.status, notes: form.notes,
        };
        update.mutate({ id: editId, ...payload }, { onSuccess: () => setOpen(false) });
      } else {
        // Create user via edge function then insert tenant
        if (!form.admin_email || !form.admin_password) {
          toast({ title: "Admin email and password are required", variant: "destructive" });
          setSaving(false);
          return;
        }
        const { data: fnData, error: fnError } = await supabase.functions.invoke("create-tenant-user", {
          body: { email: form.admin_email, password: form.admin_password, display_name: form.admin_display_name || form.name },
        });
        if (fnError || fnData?.error) {
          toast({ title: "Error creating admin user", description: fnData?.error || fnError?.message, variant: "destructive" });
          setSaving(false);
          return;
        }
        const owner_user_id = fnData.user_id;
        const { error: insertError } = await supabase.from("tenants").insert({
          name: form.name,
          company_name: form.company_name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          domain: form.domain,
          owner_user_id,
          package_id: form.package_id || null,
          subscription_type: form.subscription_type,
          subscription_start: form.subscription_start,
          subscription_end: form.subscription_end || null,
          status: form.status,
          notes: form.notes,
        } as any);
        if (insertError) {
          toast({ title: "Error creating tenant", description: insertError.message, variant: "destructive" });
        } else {
          toast({ title: "Tenant created successfully" });
          setOpen(false);
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const daysLeft = (end: string | null) => {
    if (!end) return null;
    const diff = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
    return diff;
  };

  const expiryBadge = (end: string | null) => {
    const days = daysLeft(end);
    if (days === null) return <span className="text-muted-foreground">—</span>;
    if (days <= 0) return <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Expired</Badge>;
    if (days <= 7) return <Badge variant="outline" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{days}d left</Badge>;
    return <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{days}d left</Badge>;
  };

  const toggleAll = () => {
    if (selected.length === filtered?.length) setSelected([]);
    else setSelected(filtered?.map(t => t.id) ?? []);
  };

  const exportData = (type: string) => {
    toast({ title: `Export as ${type}`, description: "Export functionality coming soon" });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Tenant Management" subtitle="Manage all business tenants & subscriptions">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => exportData("Excel")}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => exportData("CSV")}><Download className="h-4 w-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportData("PDF")}><FileText className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" size="sm" onClick={() => exportData("Print")}><Printer className="h-4 w-4 mr-1" />Print</Button>
          <Button onClick={openNew} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Client
          </Button>
        </div>
      </PageHeader>

      {/* Filters Row */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Show</Label>
              <Select value={String(perPage)} onValueChange={(v) => setPerPage(+v)}>
                <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, phone, company..." className="pl-9 h-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterPackage} onValueChange={setFilterPackage}>
              <SelectTrigger className="w-40 h-8"><SelectValue placeholder="All Packages" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Packages</SelectItem>
                {packages?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36 h-8"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="free_trial">Free Trial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10"><Checkbox checked={selected.length === filtered?.length && (filtered?.length ?? 0) > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={12} className="text-center py-8">Loading…</TableCell></TableRow>
              ) : !filtered?.length ? (
                <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No tenants found</TableCell></TableRow>
              ) : filtered.map((t: any) => (
                <TableRow key={t.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(t.id)}
                      onCheckedChange={(c) => setSelected(c ? [...selected, t.id] : selected.filter(s => s !== t.id))}
                    />
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{t.name}</p>
                  </TableCell>
                  <TableCell>
                    {t.domain ? (
                      <a href={`https://${t.domain}`} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline">{t.domain}</a>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">{t.saas_packages?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">{(t.subscription_type ?? "monthly").replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{t.company_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{t.phone ?? "—"}</TableCell>
                  <TableCell className="text-xs">{t.email ?? "—"}</TableCell>
                  <TableCell className="text-xs">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{expiryBadge(t.subscription_end)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[t.status] ?? ""}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => openEdit(t)}><Pencil className="h-4 w-4 mr-2" />Edit Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(t)}><Eye className="h-4 w-4 mr-2" />Billing Settings</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setExtendId(t.id); setExtendDays(30); setExtendOpen(true); }}>
                          <CalendarPlus className="h-4 w-4 mr-2" />Extend Period
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {t.status !== "suspended" ? (
                          <DropdownMenuItem onClick={() => suspend.mutate(t.id)}><Ban className="h-4 w-4 mr-2" />Suspend</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => activate.mutate(t.id)}><CheckCircle className="h-4 w-4 mr-2" />Activate</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => toast({ title: "Password reset", description: "Coming soon" })}>
                          <KeyRound className="h-4 w-4 mr-2" />Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => remove.mutate(t.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />Delete
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

      <div className="text-xs text-muted-foreground">
        Showing {filtered?.length ?? 0} of {tenants?.length ?? 0} tenants
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Tenant" : "Add New Client"}</DialogTitle></DialogHeader>

          {!editId && (
            <>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-primary flex items-center gap-2"><KeyRound className="h-4 w-4" /> Admin Account</h4>
                <p className="text-xs text-muted-foreground">Create the admin user for this tenant</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Label>Display Name</Label><Input value={form.admin_display_name} onChange={(e) => setForm({ ...form, admin_display_name: e.target.value })} placeholder="Admin name" /></div>
                <div><Label>Email *</Label><Input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} placeholder="admin@example.com" /></div>
                <div><Label>Password *</Label><Input type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} placeholder="Min 6 chars" /></div>
              </div>
              <Separator />
            </>
          )}

          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-primary">Business Information</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Business Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Company Name</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Domain</Label><Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="shop.example.com" /></div>
          </div>

          <Separator />

          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-primary">Subscription</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Package</Label>
              <Select value={form.package_id} onValueChange={(v) => setForm({ ...form, package_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                <SelectContent>
                  {packages?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — ৳{p.price}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subscription Type</Label>
              <Select value={form.subscription_type} onValueChange={(v) => setForm({ ...form, subscription_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="free_trial">Free Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Start Date</Label><Input type="date" value={form.subscription_start} onChange={(e) => setForm({ ...form, subscription_start: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.subscription_end} onChange={(e) => setForm({ ...form, subscription_end: e.target.value })} /></div>
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
          </div>

          <Separator />

          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-primary">Payment</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input type="number" value={form.payment_amount} onChange={(e) => setForm({ ...form, payment_amount: e.target.value })} placeholder="0" /></div>
          </div>

          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || (!editId && (!form.admin_email || !form.admin_password))}>
              {saving ? "Saving..." : editId ? "Update" : "Create Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Extend Subscription</DialogTitle></DialogHeader>
          <div><Label>Days to add</Label><Input type="number" value={extendDays} onChange={(e) => setExtendDays(+e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>Cancel</Button>
            <Button onClick={() => extend.mutate({ id: extendId, days: extendDays }, { onSuccess: () => setExtendOpen(false) })}>Extend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
