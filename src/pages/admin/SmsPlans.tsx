import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SmsPlans() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ name: "", sms_count: 1000, price: 500, validity_days: 30, description: "", is_active: true });

  const { data = [], isLoading } = useQuery({
    queryKey: ["sms_plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sms_plans").select("*").order("price");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, sms_count: Number(form.sms_count), price: Number(form.price), validity_days: form.validity_days ? Number(form.validity_days) : null };
      if (editId) {
        const { error } = await supabase.from("sms_plans").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sms_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sms_plans"] }); setOpen(false); setEditId(null); toast({ title: "Saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("sms_plans").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sms_plans"] }); toast({ title: "Deleted" }); },
  });

  const openNew = () => { setForm({ name: "", sms_count: 1000, price: 500, validity_days: 30, description: "", is_active: true }); setEditId(null); setOpen(true); };
  const openEdit = (row: any) => { setForm(row); setEditId(row.id); setOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader title="SMS Plans" description="Bundles tenants can purchase">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Plan</Button>
      </PageHeader>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="grid gap-3 md:grid-cols-3">
          {data.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    <p className="font-semibold">{p.name}</p>
                  </div>
                  <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Off"}</Badge>
                </div>
                <p className="text-2xl font-bold">৳{Number(p.price).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{p.sms_count.toLocaleString()} SMS{p.validity_days ? ` · ${p.validity_days}d validity` : ""}</p>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                <div className="flex gap-1 pt-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!data.length && <p className="text-sm text-muted-foreground">No plans yet.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Plan" : "New Plan"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>SMS Count</Label><Input type="number" value={form.sms_count} onChange={(e) => setForm({ ...form, sms_count: e.target.value })} /></div>
              <div><Label>Price (৳)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><Label>Validity (days)</Label><Input type="number" value={form.validity_days || ""} onChange={(e) => setForm({ ...form, validity_days: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}