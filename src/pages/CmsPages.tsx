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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, Eye, GripVertical } from "lucide-react";
import { useCmsPages, useCmsMutations } from "@/hooks/useWarrantyCms";

const SECTION_TYPES = [
  { value: "hero", label: "Hero Banner" },
  { value: "text", label: "Text Block" },
  { value: "image_text", label: "Image + Text" },
  { value: "features", label: "Features Grid" },
  { value: "cta", label: "Call to Action" },
  { value: "gallery", label: "Image Gallery" },
  { value: "testimonials", label: "Testimonials" },
  { value: "faq", label: "FAQ" },
  { value: "custom_html", label: "Custom HTML" },
];

interface Section {
  id: string;
  type: string;
  title: string;
  content: string;
  image_url: string;
}

const newSection = (): Section => ({ id: crypto.randomUUID(), type: "text", title: "", content: "", image_url: "" });

export default function CmsPages() {
  const { data: pages, isLoading } = useCmsPages();
  const { upsertPage, deletePage } = useCmsMutations();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: "", slug: "", content: [] as Section[], status: "draft", meta_title: "", meta_description: "" });

  const filtered = (pages ?? []).filter((p: any) => p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase()));

  const handleSave = () => {
    const payload = { ...form };
    if (!payload.slug) payload.slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    upsertPage.mutate(payload, { onSuccess: () => setOpen(false) });
  };

  const handleEdit = (page: any) => {
    setForm({ ...page, content: Array.isArray(page.content) ? page.content : [] });
    setOpen(true);
  };

  const addSection = () => setForm({ ...form, content: [...form.content, newSection()] });
  const updateSection = (idx: number, field: string, value: string) => {
    const updated = [...form.content];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, content: updated });
  };
  const removeSection = (idx: number) => setForm({ ...form, content: form.content.filter((_: any, i: number) => i !== idx) });

  return (
    <div className="space-y-4">
      <PageHeader title="CMS Pages" description="Build and manage content pages" actions={
        <Button onClick={() => { setForm({ title: "", slug: "", content: [newSection()], status: "draft", meta_title: "", meta_description: "" }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />New Page</Button>
      } />
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search pages..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Title</TableHead><TableHead>Slug</TableHead><TableHead>Sections</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead><TableHead className="w-28">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => (<TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)) :
              filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No pages yet</TableCell></TableRow> :
                filtered.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground">/{p.slug}</TableCell>
                    <TableCell>{Array.isArray(p.content) ? p.content.length : 0}</TableCell>
                    <TableCell><Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                    <TableCell>{new Date(p.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deletePage.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} Page</DialogTitle></DialogHeader>
          <Tabs defaultValue="content">
            <TabsList><TabsTrigger value="content">Content</TabsTrigger><TabsTrigger value="seo">SEO</TabsTrigger></TabsList>

            <TabsContent value="content" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Page Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="About Us" /></div>
                <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="about-us" /></div>
              </div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem></SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between"><Label className="text-base font-semibold">Sections</Label><Button size="sm" variant="outline" onClick={addSection}><Plus className="h-3 w-3 mr-1" />Add Section</Button></div>
                {(form.content as Section[]).map((section, idx) => (
                  <Card key={section.id}>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Section {idx + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={section.type} onValueChange={(v) => updateSection(idx, "type", v)}>
                            <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{SECTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeSection(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="space-y-2"><Label>Title</Label><Input value={section.title} onChange={(e) => updateSection(idx, "title", e.target.value)} /></div>
                      <div className="space-y-2"><Label>Content</Label><Textarea value={section.content} onChange={(e) => updateSection(idx, "content", e.target.value)} rows={3} /></div>
                      <div className="space-y-2"><Label>Image URL</Label><Input value={section.image_url} onChange={(e) => updateSection(idx, "image_url", e.target.value)} placeholder="https://..." /></div>
                    </CardContent>
                  </Card>
                ))}
                {form.content.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No sections yet. Click "Add Section" to start building.</p>}
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4">
              <div className="space-y-2"><Label>Meta Title</Label><Input value={form.meta_title || ""} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} placeholder="Page title for search engines" /></div>
              <div className="space-y-2"><Label>Meta Description</Label><Textarea value={form.meta_description || ""} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} rows={2} placeholder="Brief description for search results" /></div>
              <div className="space-y-2"><Label>Featured Image URL</Label><Input value={form.featured_image || ""} onChange={(e) => setForm({ ...form, featured_image: e.target.value })} /></div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title || upsertPage.isPending}>{upsertPage.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
