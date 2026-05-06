import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SmsPurchases() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ tenant_id: "", plan_id: "", sms_count: 0, amount: 0, status: "completed", payment_method: "manual", reference_no: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["sms_purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_purchases")
        .select("*, sms_plans(name), tenants(name)")
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants_min"],
    queryFn: async () => {
      const { data } = await supabase.from("tenants").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["sms_plans_active"],
    queryFn: async () => {
      const { data } = await supabase.from("sms_plans").select("id, name, sms_count, price").eq("is_active", true);
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sms_purchases").insert({
        tenant_id: form.tenant_id,
        plan_id: form.plan_id || null,
        sms_count: Number(form.sms_count),
        amount: Number(form.amount),
        status: form.status,
        payment_method: form.payment_method,
        reference_no: form.reference_no,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sms_purchases"] }); setOpen(false); toast({ title: "Recorded" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const onPlanChange = (id: string) => {
    const p = plans.find((x: any) => x.id === id);
    setForm({ ...form, plan_id: id, sms_count: p?.sms_count ?? 0, amount: p?.price ?? 0 });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="SMS Purchases" description="Tenant purchase ledger">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Record Purchase</Button>
      </PageHeader>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {data.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.tenants?.name ?? "Unknown tenant"}</p>
                  <p className="text-xs text-muted-foreground">{r.sms_plans?.name ?? "Custom"} · {r.sms_count.toLocaleString()} SMS · {new Date(r.purchased_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">৳{Number(r.amount).toLocaleString()}</p>
                  <Badge variant={r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {!data.length && <p className="text-sm text-muted-foreground">No purchases yet.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Record SMS Purchase</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tenant</Label>
              <Select value={form.tenant_id} onValueChange={(v) => setForm({ ...form, tenant_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                <SelectContent>{tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan</Label>
              <Select value={form.plan_id} onValueChange={onPlanChange}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} — ৳{p.price}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SMS Count</Label><Input type="number" value={form.sms_count} onChange={(e) => setForm({ ...form, sms_count: e.target.value })} /></div>
              <div><Label>Amount (৳)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Payment Method</Label><Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} /></div>
              <div><Label>Reference</Label><Input value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.tenant_id}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}