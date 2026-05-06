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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FREQS = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];

export default function Sitemap() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ path: "/", priority: 0.5, changefreq: "monthly", is_active: true, notes: "" });

  const { data = [], isLoading } = useQuery({
    queryKey: ["sitemap_entries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sitemap_entries").select("*").order("path");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, priority: Number(form.priority) };
      if (editId) {
        const { error } = await supabase.from("sitemap_entries").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sitemap_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sitemap_entries"] }); setOpen(false); setEditId(null); toast({ title: "Saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("sitemap_entries").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sitemap_entries"] }); toast({ title: "Deleted" }); },
  });

  const openNew = () => { setForm({ path: "/", priority: 0.5, changefreq: "monthly", is_active: true, notes: "" }); setEditId(null); setOpen(true); };
  const openEdit = (row: any) => { setForm(row); setEditId(row.id); setOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader title="Sitemap CMS" description="Manage public sitemap entries">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>
      </PageHeader>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {data.map((e: any) => (
            <Card key={e.id}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm truncate">{e.path}</p>
                  <p className="text-xs text-muted-foreground">priority {e.priority} · {e.changefreq}</p>
                </div>
                <Badge variant={e.is_active ? "default" : "secondary"}>{e.is_active ? "On" : "Off"}</Badge>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!data.length && <p className="text-sm text-muted-foreground">No entries yet.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Edit Entry" : "New Entry"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Path</Label><Input value={form.path} onChange={(ev) => setForm({ ...form, path: ev.target.value })} placeholder="/about" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority (0–1)</Label><Input type="number" step="0.1" min="0" max="1" value={form.priority} onChange={(ev) => setForm({ ...form, priority: ev.target.value })} /></div>
              <div>
                <Label>Change frequency</Label>
                <Select value={form.changefreq} onValueChange={(v) => setForm({ ...form, changefreq: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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