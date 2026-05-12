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
  FileSpreadsheet, FileText, Printer, Download, KeyRound, Eye, ShieldCheck
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TenantForm {
  admin_display_name: string;
  admin_email: string;
  admin_password: string;
  name: string;
  company_name: string;
  phone: string;
  email: string;
  address: string;
  domain: string;
  package_id: string;
  subscription_type: string;
  subscription_start: string;
  subscription_end: string;
  status: string;
  notes: string;
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
  active: "bg-emerald-500/20 text-primary border-emerald-500/30",
  trial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
  expired: "bg-slate-500/20 text-muted-foreground border-slate-500/30",
  pending_approval: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function TenantManagement() {
  const { data: tenants, isLoading } = useTenants();
  const { data: packages } = usePackages();
  const { update, remove, suspend, activate, extend } = useTenantMutations();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterPackage, setFilterPackage] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [perPage, setPerPage] = useState(25);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendId, setExtendId] = useState("");
  const [extendDays, setExtendDays] = useState(30);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  // Password reset
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState("");
  const [resetTenantName, setResetTenantName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const filtered = tenants?.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.phone ?? "").includes(search) ||
      ((t as any).company_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchPkg = filterPackage === "all" || t.package_id === filterPackage;
    const matchType = filterType === "all" || (t as any).subscription_type === filterType;
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    return matchSearch && matchPkg && matchType && matchStatus;
  })?.slice(0, perPage);

  const pendingCount = tenants?.filter(t => t.status === "pending_approval").length ?? 0;

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
          name: form.name, company_name: form.company_name, phone: form.phone,
          email: form.email, address: form.address, domain: form.domain,
          owner_user_id, package_id: form.package_id || null,
          subscription_type: form.subscription_type, subscription_start: form.subscription_start,
          subscription_end: form.subscription_end || null, status: form.status, notes: form.notes,
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

  const handleApprove = (t: any) => {
    const startDate = new Date().toISOString().split("T")[0];
    const pkg = packages?.find(p => p.id === t.package_id);
    const days = pkg?.duration_days ?? 30;
    const endDate = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
    update.mutate({
      id: t.id, status: "active",
      subscription_start: startDate, subscription_end: endDate,
    } as any);
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-tenant-password", {
        body: { user_id: resetUserId, new_password: newPassword },
      });
      if (error || data?.error) {
        toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
      } else {
        toast({ title: "Password reset successfully" });
        setResetOpen(false);
        setNewPassword("");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const daysLeft = (end: string | null) => {
    if (!end) return null;
    return Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
  };

  const expiryBadge = (end: string | null) => {
    const days = daysLeft(end);
    if (days === null) return <span className="text-muted-foreground">—</span>;
    if (days <= 0) return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">Expired</Badge>;
    if (days <= 7) return <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">{days}d left</Badge>;
    return <Badge variant="outline" className="bg-emerald-500/20 text-primary border-emerald-500/30">{days}d left</Badge>;
  };

  const toggleAll = () => {
    if (selected.length === filtered?.length) setSelected([]);
    else setSelected(filtered?.map(t => t.id) ?? []);
  };

  // Export helpers
  const getExportRows = () => {
    return (filtered ?? []).map((t: any) => ({
      Name: t.name,
      Domain: t.domain ?? "",
      Package: t.saas_packages?.name ?? "",
      Type: (t.subscription_type ?? "monthly").replace("_", " "),
      Company: t.company_name ?? "",
      Phone: t.phone ?? "",
      Email: t.email ?? "",
      Created: new Date(t.created_at).toLocaleDateString(),
      Expiry: t.subscription_end ?? "",
      Status: t.status,
    }));
  };

  const exportCSV = () => {
    const rows = getExportRows();
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "tenants.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const rows = getExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tenants");
    XLSX.writeFile(wb, "tenants.xlsx");
  };

  const exportPDF = () => {
    const rows = getExportRows();
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Tenant Report", 14, 15);
    const headers = Object.keys(rows[0] ?? {});
    autoTable(doc, {
      head: [headers],
      body: rows.map(r => headers.map(h => (r as any)[h])),
      startY: 22,
      styles: { fontSize: 8 },
    });
    doc.save("tenants.pdf");
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      <PageHeader title="Tenant Management" subtitle="Manage all business tenants & subscriptions">
        <div className="flex items-center gap-2 flex-wrap">
          {pendingCount > 0 && (
            <Button variant="outline" size="sm" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              onClick={() => setFilterStatus("pending_approval")}>
              <ShieldCheck className="h-4 w-4 mr-1" />{pendingCount} Pending
            </Button>
          )}
          <Button variant="outline" size="sm" className="border-border text-foreground/90 hover:bg-muted" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
          <Button variant="outline" size="sm" className="border-border text-foreground/90 hover:bg-muted" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" className="border-border text-foreground/90 hover:bg-muted" onClick={exportPDF}><FileText className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" size="sm" className="border-border text-foreground/90 hover:bg-muted" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" />Print</Button>
          <Button onClick={openNew} size="sm" className="bg-primary hover:bg-primary/90 text-foreground">
            <Plus className="h-4 w-4 mr-1" /> Add Client
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card/60 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Show</Label>
            <Select value={String(perPage)} onValueChange={(v) => setPerPage(+v)}>
              <SelectTrigger className="w-20 h-8 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-muted border-border">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, email, phone, company..." className="pl-9 h-8 bg-muted border-border text-foreground placeholder:text-muted-foreground" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterPackage} onValueChange={setFilterPackage}>
            <SelectTrigger className="w-40 h-8 bg-muted border-border text-foreground"><SelectValue placeholder="All Packages" /></SelectTrigger>
            <SelectContent className="bg-muted border-border">
              <SelectItem value="all">All Packages</SelectItem>
              {packages?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36 h-8 bg-muted border-border text-foreground"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent className="bg-muted border-border">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="free_trial">Free Trial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 h-8 bg-muted border-border text-foreground"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent className="bg-muted border-border">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="pending_approval">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-card">
                <TableHead className="w-10 text-muted-foreground"><Checkbox checked={selected.length === filtered?.length && (filtered?.length ?? 0) > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground">Domain</TableHead>
                <TableHead className="text-muted-foreground">Package</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Company</TableHead>
                <TableHead className="text-muted-foreground">Phone</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Created</TableHead>
                <TableHead className="text-muted-foreground">Expiry</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : !filtered?.length ? (
                <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No tenants found</TableCell></TableRow>
              ) : filtered.map((t: any) => (
                <TableRow key={t.id} className="border-border hover:bg-muted/50">
                  <TableCell>
                    <Checkbox checked={selected.includes(t.id)} onCheckedChange={(c) => setSelected(c ? [...selected, t.id] : selected.filter(s => s !== t.id))} />
                  </TableCell>
                  <TableCell><p className="font-medium text-sm text-foreground">{t.name}</p></TableCell>
                  <TableCell>
                    {t.domain ? (
                      <a href={`https://${t.domain}`} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline">{t.domain}</a>
                    ) : <span className="text-muted-foreground/70 text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-foreground/90">{t.saas_packages?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize bg-muted text-foreground/90 border-border">{(t.subscription_type ?? "monthly").replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-foreground/90">{t.company_name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-foreground/90">{t.phone ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.email ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{expiryBadge(t.subscription_end)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[t.status] ?? "bg-muted text-muted-foreground"}>{t.status === "pending_approval" ? "Pending" : t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 bg-muted border-border">
                        <DropdownMenuItem onClick={() => openEdit(t)} className="text-foreground focus:bg-accent"><Pencil className="h-4 w-4 mr-2" />Edit Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(t)} className="text-foreground focus:bg-accent"><Eye className="h-4 w-4 mr-2" />Billing Settings</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setExtendId(t.id); setExtendDays(30); setExtendOpen(true); }} className="text-foreground focus:bg-accent">
                          <CalendarPlus className="h-4 w-4 mr-2" />Extend Period
                        </DropdownMenuItem>
                        {t.status === "pending_approval" && (
                          <DropdownMenuItem onClick={() => handleApprove(t)} className="text-primary focus:bg-accent">
                            <ShieldCheck className="h-4 w-4 mr-2" />Approve
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-muted" />
                        {t.status !== "suspended" ? (
                          <DropdownMenuItem onClick={() => suspend.mutate(t.id)} className="text-red-400 focus:bg-accent"><Ban className="h-4 w-4 mr-2" />Suspend</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => activate.mutate(t.id)} className="text-primary focus:bg-accent"><CheckCircle className="h-4 w-4 mr-2" />Activate</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => { setResetUserId(t.owner_user_id); setResetTenantName(t.name); setNewPassword(""); setResetOpen(true); }} className="text-foreground focus:bg-accent">
                          <KeyRound className="h-4 w-4 mr-2" />Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-muted" />
                        <DropdownMenuItem className="text-red-400 focus:bg-accent" onClick={() => remove.mutate(t.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {filtered?.length ?? 0} of {tenants?.length ?? 0} tenants
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-card border-border text-foreground">
          <DialogHeader><DialogTitle className="text-foreground">{editId ? "Edit Tenant" : "Add New Client"}</DialogTitle></DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4">
          {!editId && (
            <>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-primary flex items-center gap-2"><KeyRound className="h-4 w-4" /> Admin Account</h4>
                <p className="text-xs text-muted-foreground">Create the admin user for this tenant</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Label className="text-foreground/90">Display Name</Label><Input className="bg-muted border-border text-foreground" value={form.admin_display_name} onChange={(e) => setForm({ ...form, admin_display_name: e.target.value })} placeholder="Admin name" /></div>
                <div><Label className="text-foreground/90">Email *</Label><Input className="bg-muted border-border text-foreground" type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} placeholder="admin@example.com" /></div>
                <div><Label className="text-foreground/90">Password *</Label><Input className="bg-muted border-border text-foreground" type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} placeholder="Min 6 chars" /></div>
              </div>
              <Separator className="bg-muted" />
            </>
          )}

          <div className="space-y-1"><h4 className="text-sm font-semibold text-primary">Business Information</h4></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-foreground/90">Business Name *</Label><Input className="bg-muted border-border text-foreground" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label className="text-foreground/90">Company Name</Label><Input className="bg-muted border-border text-foreground" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
            <div><Label className="text-foreground/90">Phone</Label><Input className="bg-muted border-border text-foreground" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label className="text-foreground/90">Email</Label><Input className="bg-muted border-border text-foreground" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label className="text-foreground/90">Address</Label><Input className="bg-muted border-border text-foreground" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <Label className="text-foreground/90">Custom Domain</Label>
              <Input
                className="bg-muted border-border text-foreground"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") })}
                placeholder="shop.example.com"
              />
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                The tenant points DNS at our hosting and this domain becomes their storefront.
                Visiting <code>{form.domain || "shop.example.com"}</code> shows the shop, and{" "}
                <code>{form.domain || "shop.example.com"}/login</code> opens the admin panel.
                <br />
                <strong>DNS records to set at the registrar:</strong>{" "}
                <code>A&nbsp;@ → 185.158.133.1</code>, <code>A&nbsp;www → 185.158.133.1</code>.
                After DNS propagates, attach the same domain once in <em>Project Settings → Domains</em> so SSL is issued.
              </p>
            </div>
          </div>

          <Separator className="bg-muted" />

          <div className="space-y-1"><h4 className="text-sm font-semibold text-primary">Subscription</h4></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground/90">Package</Label>
              <Select value={form.package_id} onValueChange={(v) => setForm({ ...form, package_id: v })}>
                <SelectTrigger className="bg-muted border-border text-foreground"><SelectValue placeholder="Select package" /></SelectTrigger>
                <SelectContent className="bg-muted border-border">
                  {packages?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — ৳{p.price}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground/90">Subscription Type</Label>
              <Select value={form.subscription_type} onValueChange={(v) => setForm({ ...form, subscription_type: v })}>
                <SelectTrigger className="bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-muted border-border">
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="free_trial">Free Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-foreground/90">Start Date</Label><Input className="bg-muted border-border text-foreground" type="date" value={form.subscription_start} onChange={(e) => setForm({ ...form, subscription_start: e.target.value })} /></div>
            <div><Label className="text-foreground/90">End Date</Label><Input className="bg-muted border-border text-foreground" type="date" value={form.subscription_end} onChange={(e) => setForm({ ...form, subscription_end: e.target.value })} /></div>
            <div>
              <Label className="text-foreground/90">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-muted border-border">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-muted" />

          <div className="space-y-1"><h4 className="text-sm font-semibold text-primary">Payment</h4></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground/90">Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger className="bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-muted border-border">
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-foreground/90">Amount</Label><Input className="bg-muted border-border text-foreground" type="number" value={form.payment_amount} onChange={(e) => setForm({ ...form, payment_amount: e.target.value })} placeholder="0" /></div>
          </div>

          <div><Label className="text-foreground/90">Notes</Label><Textarea className="bg-muted border-border text-foreground" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" className="border-border text-foreground/90 hover:bg-muted" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-foreground" disabled={saving || !form.name || (!editId && (!form.admin_email || !form.admin_password))}>
              {saving ? "Saving..." : editId ? "Update" : "Create Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="max-w-sm bg-card border-border text-foreground">
          <DialogHeader><DialogTitle className="text-foreground">Extend Subscription</DialogTitle></DialogHeader>
          <div><Label className="text-foreground/90">Days to add</Label><Input className="bg-muted border-border text-foreground" type="number" value={extendDays} onChange={(e) => setExtendDays(+e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" className="border-border text-foreground/90" onClick={() => setExtendOpen(false)}>Cancel</Button>
            <Button className="bg-primary hover:bg-primary/90 text-foreground" onClick={() => extend.mutate({ id: extendId, days: extendDays }, { onSuccess: () => setExtendOpen(false) })}>Extend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm bg-card border-border text-foreground">
          <DialogHeader><DialogTitle className="text-foreground">Reset Password</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Reset password for <span className="text-foreground font-medium">{resetTenantName}</span></p>
          <div><Label className="text-foreground/90">New Password</Label><Input className="bg-muted border-border text-foreground" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" /></div>
          <DialogFooter>
            <Button variant="outline" className="border-border text-foreground/90" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button className="bg-primary hover:bg-primary/90 text-foreground" onClick={handleResetPassword} disabled={resetting || newPassword.length < 6}>
              {resetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
