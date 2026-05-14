import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Search, Truck, History, Printer } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["pending", "packed", "shipped", "in_transit", "delivered", "returned", "cancelled"] as const;
type Status = typeof STATUSES[number];

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary", packed: "secondary", shipped: "default",
  in_transit: "default", delivered: "default", returned: "destructive", cancelled: "destructive",
};

const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending", packed: "Packed", shipped: "Shipped",
  in_transit: "In Transit", delivered: "Delivered", returned: "Returned", cancelled: "Cancelled",
};

const NONE = "__none__";
const defaultForm = {
  sale_id: NONE, courier: "", tracking_no: "", status: "pending" as Status,
  recipient_name: "", recipient_phone: "", shipping_address: "", city: "",
  shipping_cost: "", weight: "", expected_delivery: "", notes: "",
};

export default function Shipments() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [historyId, setHistoryId] = useState<string | null>(null);

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*, sales(invoice_no, customer_id, customers(name, phone))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["shipments-sales-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, invoice_no, sale_date, total, customers(name, phone, address)")
        .order("sale_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: history } = useQuery({
    queryKey: ["shipment-history", historyId],
    enabled: !!historyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipment_status_history")
        .select("*")
        .eq("shipment_id", historyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        sale_id: form.sale_id === NONE ? null : form.sale_id,
        courier: form.courier || null,
        tracking_no: form.tracking_no || null,
        status: form.status,
        recipient_name: form.recipient_name || null,
        recipient_phone: form.recipient_phone || null,
        shipping_address: form.shipping_address || null,
        city: form.city || null,
        shipping_cost: form.shipping_cost === "" ? 0 : Number(form.shipping_cost),
        weight: form.weight === "" ? null : Number(form.weight),
        expected_delivery: form.expected_delivery || null,
        notes: form.notes || null,
        shipped_at: ["shipped", "in_transit", "delivered"].includes(form.status) ? new Date().toISOString() : null,
        delivered_at: form.status === "delivered" ? new Date().toISOString() : null,
      };
      if (editId) {
        const { data: prev } = await supabase.from("shipments").select("status").eq("id", editId).maybeSingle();
        const { error } = await supabase.from("shipments").update(payload).eq("id", editId);
        if (error) throw error;
        if (prev?.status !== form.status) {
          await supabase.from("shipment_status_history").insert({
            shipment_id: editId, status: form.status, changed_by: user?.id, note: "Status updated",
          });
        }
      } else {
        payload.created_by = user?.id;
        const { data, error } = await supabase.from("shipments").insert(payload).select("id").single();
        if (error) throw error;
        await supabase.from("shipment_status_history").insert({
          shipment_id: data.id, status: form.status, changed_by: user?.id, note: "Created",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipments"] });
      setOpen(false); setEditId(null); setForm(defaultForm);
      toast.success(editId ? "Shipment updated" : "Shipment created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shipments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipments"] });
      toast.success("Shipment deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const patch: any = { status };
      if (["shipped", "in_transit"].includes(status)) patch.shipped_at = new Date().toISOString();
      if (status === "delivered") patch.delivered_at = new Date().toISOString();
      const { error } = await supabase.from("shipments").update(patch).eq("id", id);
      if (error) throw error;
      await supabase.from("shipment_status_history").insert({
        shipment_id: id, status, changed_by: user?.id, note: "Quick status change",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipments"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // When user picks a sale, prefill recipient from customer
  useEffect(() => {
    if (form.sale_id === NONE || editId) return;
    const sale = sales?.find((s: any) => s.id === form.sale_id);
    if (!sale) return;
    const c = (sale as any).customers;
    if (c) {
      setForm(f => ({
        ...f,
        recipient_name: f.recipient_name || c.name || "",
        recipient_phone: f.recipient_phone || c.phone || "",
        shipping_address: f.shipping_address || c.address || "",
      }));
    }
  }, [form.sale_id, sales, editId]);

  const filtered = useMemo(() => {
    return (shipments || []).filter((s: any) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return [s.tracking_no, s.courier, s.recipient_name, s.recipient_phone, s.sales?.invoice_no, s.sales?.customers?.name]
        .some(v => (v || "").toString().toLowerCase().includes(q));
    });
  }, [shipments, statusFilter, search]);

  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({
      sale_id: s.sale_id || NONE,
      courier: s.courier || "",
      tracking_no: s.tracking_no || "",
      status: s.status,
      recipient_name: s.recipient_name || "",
      recipient_phone: s.recipient_phone || "",
      shipping_address: s.shipping_address || "",
      city: s.city || "",
      shipping_cost: s.shipping_cost?.toString() || "",
      weight: s.weight?.toString() || "",
      expected_delivery: s.expected_delivery || "",
      notes: s.notes || "",
    });
    setOpen(true);
  };

  const printLabel = (s: any) => {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`
      <html><head><title>Shipping Label</title>
      <style>body{font-family:sans-serif;padding:16px;font-size:12px}h2{margin:0 0 8px}hr{margin:8px 0}.b{font-weight:600}</style>
      </head><body>
      <h2>SHIPPING LABEL</h2>
      <div class="b">Tracking: ${s.tracking_no || "-"}</div>
      <div>Courier: ${s.courier || "-"}</div>
      <hr/>
      <div class="b">TO:</div>
      <div>${s.recipient_name || "-"}</div>
      <div>${s.recipient_phone || ""}</div>
      <div>${s.shipping_address || ""}</div>
      <div>${s.city || ""}</div>
      <hr/>
      <div>Invoice: ${s.sales?.invoice_no || "-"}</div>
      <div>Status: ${STATUS_LABEL[s.status as Status] || s.status}</div>
      <div>Cost: ${s.shipping_cost || 0}</div>
      ${s.weight ? `<div>Weight: ${s.weight} kg</div>` : ""}
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Shipments" description="Track and manage all outbound shipments">
        <Button onClick={() => { setEditId(null); setForm(defaultForm); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Shipment
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by tracking, courier, recipient, invoice..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
              No shipments found
            </div>
          ) : (
            <div className="overflow-x-auto scroll-x -mx-4 sm:mx-0 px-4 sm:px-0">
              <Table className="min-w-[680px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Tracking</TableHead>
                    <TableHead className="hidden md:table-cell">Courier</TableHead>
                    <TableHead className="hidden sm:table-cell">Invoice</TableHead>
                    <TableHead className="whitespace-nowrap">Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Expected</TableHead>
                    <TableHead className="text-right sticky right-0 bg-background z-10">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{s.tracking_no || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">{s.courier || "-"}</TableCell>
                      <TableCell className="hidden sm:table-cell">{s.sales?.invoice_no || "-"}</TableCell>
                      <TableCell className="max-w-[140px]">
                        <div className="text-sm">{s.recipient_name || "-"}</div>
                        <div className="text-xs text-muted-foreground">{s.recipient_phone || ""}</div>
                      </TableCell>
                      <TableCell>
                        <Select value={s.status} onValueChange={(v) => updateStatus.mutate({ id: s.id, status: v as Status })}>
                          <SelectTrigger className="h-8 w-28 sm:w-36">
                            <Badge variant={STATUS_VARIANT[s.status as Status] || "secondary"}>{STATUS_LABEL[s.status as Status] || s.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(st => <SelectItem key={st} value={st}>{STATUS_LABEL[st]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm hidden md:table-cell whitespace-nowrap">{s.expected_delivery || "-"}</TableCell>
                      <TableCell className="text-right sticky right-0 bg-background z-10">
                        <div className="flex justify-end gap-0.5">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => printLabel(s)} title="Print label"><Printer className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setHistoryId(s.id)} title="History"><History className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { if (confirm("Delete this shipment?")) remove.mutate(s.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(defaultForm); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Shipment" : "New Shipment"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Linked Sale (optional)</Label>
              <Select value={form.sale_id} onValueChange={(v) => setForm(f => ({ ...f, sale_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a sale" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {sales?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.invoice_no} — {s.customers?.name || "Walk-in"} ({s.sale_date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Courier</Label>
              <Input value={form.courier} onChange={(e) => setForm(f => ({ ...f, courier: e.target.value }))} placeholder="e.g. Pathao, Steadfast" />
            </div>
            <div>
              <Label>Tracking Number</Label>
              <Input value={form.tracking_no} onChange={(e) => setForm(f => ({ ...f, tracking_no: e.target.value }))} />
            </div>
            <div>
              <Label>Recipient Name</Label>
              <Input value={form.recipient_name} onChange={(e) => setForm(f => ({ ...f, recipient_name: e.target.value }))} />
            </div>
            <div>
              <Label>Recipient Phone</Label>
              <Input value={form.recipient_phone} onChange={(e) => setForm(f => ({ ...f, recipient_phone: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Shipping Address</Label>
              <Textarea rows={2} value={form.shipping_address} onChange={(e) => setForm(f => ({ ...f, shipping_address: e.target.value }))} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as Status }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shipping Cost</Label>
              <Input type="number" step="0.01" value={form.shipping_cost} onChange={(e) => setForm(f => ({ ...f, shipping_cost: e.target.value }))} />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.01" value={form.weight} onChange={(e) => setForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Expected Delivery</Label>
              <Input type="date" value={form.expected_delivery} onChange={(e) => setForm(f => ({ ...f, expected_delivery: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{editId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyId} onOpenChange={(o) => !o && setHistoryId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Status History</DialogTitle></DialogHeader>
          {!history?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No history yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.map((h: any) => (
                <div key={h.id} className="flex justify-between items-center border rounded p-2 text-sm">
                  <div>
                    <Badge variant={STATUS_VARIANT[h.status as Status] || "secondary"}>{STATUS_LABEL[h.status as Status] || h.status}</Badge>
                    {h.note && <span className="ml-2 text-muted-foreground">{h.note}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}