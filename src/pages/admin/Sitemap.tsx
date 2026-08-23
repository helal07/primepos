import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Download, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FREQS = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];
const SITEMAP_URL = "/sitemap.xml";
const DEFAULT_BASE = "https://pos.itsheba.bd";

export default function Sitemap() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ url: "/", priority: 0.5, changefreq: "monthly", is_active: true, notes: "" });
  const [baseUrl, setBaseUrl] = useState<string>(DEFAULT_BASE);
  const [generatedXml, setGeneratedXml] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  // Load saved canonical base from business_settings.cms_seo
  useQuery({
    queryKey: ["cms_seo_base"],
    queryFn: async () => {
      const rows = await rest.all<any>("business_settings", { filter: { key: "cms_seo" }, perPage: 1 });
      const v = (rows[0]?.value as any) || {};
      const candidate = v.canonical_url || v.site_url || v.base_url;
      if (candidate) setBaseUrl(String(candidate).replace(/\/$/, ""));
      return rows[0] ?? null;
    },
  });

  const liveUrl = `${SITEMAP_URL}?base=${encodeURIComponent(baseUrl.replace(/\/$/, ""))}`;

  const generate = async () => {
    const clean = baseUrl.trim().replace(/\/$/, "");
    if (!/^https?:\/\//.test(clean)) {
      toast({ title: "Invalid URL", description: "Base URL must start with http:// or https://", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      // Persist canonical base to business_settings.cms_seo
      const existingRows = await rest.all<any>("business_settings", { filter: { key: "cms_seo" }, perPage: 1 });
      const existing = existingRows[0] ?? null;
      const merged = { ...((existing?.value as any) || {}), canonical_url: clean };
      if (existing) {
        await rest.update("business_settings", existing.id, { value: merged });
      } else {
        await rest.create("business_settings", { key: "cms_seo", value: merged });
      }
      const res = await fetch(`${SITEMAP_URL}?base=${encodeURIComponent(clean)}&t=${Date.now()}`);
      const xml = await res.text();
      setGeneratedXml(xml);
      toast({ title: "Sitemap generated", description: `Base URL set to ${clean}` });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const downloadGenerated = () => {
    const xml = generatedXml;
    if (!xml) return;
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sitemap.xml"; a.click();
    URL.revokeObjectURL(url);
  };

  const { data = [], isLoading } = useQuery({
    queryKey: ["sitemap_entries"],
    queryFn: async () => {
      return await rest.all<any>("sitemap_entries", { sort: "url", perPage: 500 });
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const url = String(form.url || "").trim();
      if (!url.startsWith("/")) throw new Error("Path must start with /, for example /about");
      const payload = { ...form, url, priority: Number(form.priority) };
      if (editId) {
        await rest.update("sitemap_entries", editId, payload);
      } else {
        await rest.create("sitemap_entries", payload);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sitemap_entries"] }); setOpen(false); setEditId(null); toast({ title: "Saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await rest.remove("sitemap_entries", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sitemap_entries"] }); toast({ title: "Deleted" }); },
  });

  const openNew = () => { setForm({ url: "/", priority: 0.5, changefreq: "monthly", is_active: true, notes: "" }); setEditId(null); setOpen(true); };
  const openEdit = (row: any) => { setForm(row); setEditId(row.id); setOpen(true); };

  const submitEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!save.isPending) save.mutate();
  };

  const downloadXml = async () => {
    try {
      const res = await fetch(liveUrl);
      const xml = await res.text();
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "sitemap.xml"; a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded", description: "Drop sitemap.xml in /public to host it at your site root." });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Sitemap CMS" description="Manage public sitemap entries">
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadXml}><Download className="h-4 w-4 mr-1" />Download XML</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground mb-1">Live sitemap URL — entries you save here are served instantly. /sitemap.xml redirects here on Apache hosting; robots.txt also references it.</p>
            <p className="font-mono text-xs truncate">{liveUrl}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(liveUrl); toast({ title: "Copied" }); }}><Copy className="h-3 w-3 mr-1" />Copy</Button>
          <Button size="sm" variant="outline" asChild><a href={liveUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Open</a></Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label>Site Base URL</Label>
            <p className="text-xs text-muted-foreground mb-2">All sitemap URLs will use this domain. Saved as the canonical site URL.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://pos.itsheba.bd" className="font-mono" />
              <Button onClick={generate} disabled={generating} className="shrink-0">
                <RefreshCw className={`h-4 w-4 mr-1 ${generating ? "animate-spin" : ""}`} />
                {generating ? "Generating…" : "Generate Sitemap"}
              </Button>
            </div>
          </div>
          {generatedXml && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Preview ({(generatedXml.match(/<url>/g) || []).length} URLs)</p>
                <Button size="sm" variant="outline" onClick={downloadGenerated}>
                  <Download className="h-3 w-3 mr-1" />Download XML
                </Button>
              </div>
              <pre className="text-xs bg-muted p-3 rounded max-h-64 overflow-auto font-mono">{generatedXml}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {data.map((e: any) => (
            <Card key={e.id}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm truncate">{e.url}</p>
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
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Entry" : "New Entry"}</DialogTitle>
            <DialogDescription>Add a public URL path to include in sitemap.xml.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitEntry} className="space-y-3">
            <div><Label>Path</Label><Input value={form.url} onChange={(ev) => setForm({ ...form, url: ev.target.value })} placeholder="/about" /></div>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}