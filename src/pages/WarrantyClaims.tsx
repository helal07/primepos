import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useWarrantyClaims, useWarrantyMutations } from "@/hooks/useWarrantyCms";
import { useCustomers } from "@/hooks/useContacts";
import { useProducts } from "@/hooks/useInventory";

const statusColor: Record<string, string> = { pending: "secondary", in_progress: "default", resolved: "outline", rejected: "destructive" };

export default function WarrantyClaims() {
  const { data: claims, isLoading } = useWarrantyClaims();
  const { upsertClaim, deleteClaim } = useWarrantyMutations();
  const { data: customerList } = useCustomers();
  const { data: productList } = useProducts();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ customer_id: "", product_id: "", claim_date: new Date().toISOString().slice(0, 10), issue_description: "", status: "pending", resolution: "", notes: "" });

  const filtered = (claims ?? []).filter((c: any) =>
    (c.customers?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.products?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    c.issue_description.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    const payload = { ...form };
    if (!payload.customer_id) delete payload.customer_id;
    if (!payload.product_id) delete payload.product_id;
    if (!payload.resolution) delete payload.resolution;
    upsertClaim.mutate(payload, { onSuccess: () => setOpen(false) });
  };

  const handleEdit = (claim: any) => {
    setForm({ ...claim, customer_id: claim.customer_id || "", product_id: claim.product_id || "" });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Warranty Claims" description="Manage warranty claims" actions={
        <Button onClick={() => { setForm({ customer_id: "", product_id: "", claim_date: new Date().toISOString().slice(0, 10), issue_description: "", status: "pending", resolution: "", notes: "" }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />New Claim</Button>
      } />
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search claims..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Customer</TableHead><TableHead>Product</TableHead><TableHead>Date</TableHead><TableHead>Issue</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 4 }).map((_, i) => (<TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)) :
              filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No warranty claims</TableCell></TableRow> :
                filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.customers?.name || "—"}</TableCell>
                    <TableCell>{c.products?.name || "—"}</TableCell>
                    <TableCell>{c.claim_date}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{c.issue_description}</TableCell>
                    <TableCell><Badge variant={statusColor[c.status] as any}>{c.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteClaim.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Warranty Claim</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Customer</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{(customers.data ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Product</Label>
                <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{(products.data ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Claim Date</Label><Input type="date" value={form.claim_date} onChange={(e) => setForm({ ...form, claim_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Issue Description *</Label><Textarea value={form.issue_description} onChange={(e) => setForm({ ...form, issue_description: e.target.value })} rows={3} /></div>
            <div className="space-y-2"><Label>Resolution</Label><Textarea value={form.resolution || ""} onChange={(e) => setForm({ ...form, resolution: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.issue_description || upsertClaim.isPending}>{upsertClaim.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
