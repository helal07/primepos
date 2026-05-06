import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SmsProviders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", gateway_type: "http", api_key: "", api_secret: "", sender_id: "", base_url: "", is_active: true });
  const [editId, setEditId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["sms_providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sms_providers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("sms_providers").update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sms_providers").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sms_providers"] }); setOpen(false); setEditId(null); toast({ title: "Saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sms_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sms_providers"] }); toast({ title: "Deleted" }); },
  });

  const openNew = () => { setForm({ name: "", gateway_type: "http", api_key: "", api_secret: "", sender_id: "", base_url: "", is_active: true }); setEditId(null); setOpen(true); };
  const openEdit = (row: any) => { setForm(row); setEditId(row.id); setOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader title="SMS Providers" description="Configure SMS gateway credentials">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Provider</Button>
      </PageHeader>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{p.name}</p>
                    <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Type: {p.gateway_type} {p.sender_id ? `· Sender: ${p.sender_id}` : ""}</p>
                  {p.base_url && <p className="text-xs text-muted-foreground truncate">{p.base_url}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!data.length && <p className="text-sm text-muted-foreground">No providers yet.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Provider" : "New Provider"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Gateway Type</Label><Input value={form.gateway_type} onChange={(e) => setForm({ ...form, gateway_type: e.target.value })} placeholder="http / twilio / sslwireless" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>API Key</Label><Input value={form.api_key || ""} onChange={(e) => setForm({ ...form, api_key: e.target.value })} /></div>
              <div><Label>API Secret</Label><Input value={form.api_secret || ""} onChange={(e) => setForm({ ...form, api_secret: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sender ID</Label><Input value={form.sender_id || ""} onChange={(e) => setForm({ ...form, sender_id: e.target.value })} /></div>
              <div><Label>Base URL</Label><Input value={form.base_url || ""} onChange={(e) => setForm({ ...form, base_url: e.target.value })} /></div>
            </div>
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