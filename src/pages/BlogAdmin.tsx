import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const empty = { id: "", slug: "", title: "", excerpt: "", cover_url: "", content: "", author_name: "", is_published: false };

export default function BlogAdmin() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const { data: tenantId } = useQuery({
    queryKey: ["my_tenant", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("tenant_id").eq("user_id", user!.id).maybeSingle();
      return data?.tenant_id ?? null;
    },
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["blog_admin", tenantId], enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("blog_posts").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const payload: any = {
        tenant_id: tenantId,
        slug: form.slug || slugify(form.title),
        title: form.title, excerpt: form.excerpt, cover_url: form.cover_url || null,
        content: form.content, author_name: form.author_name || null,
        is_published: !!form.is_published,
        published_at: form.is_published ? (form.published_at || new Date().toISOString()) : null,
      };
      if (form.id) {
        const { error } = await (supabase as any).from("blog_posts").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        payload.created_by = user!.id;
        const { error } = await (supabase as any).from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blog_admin"] }); setOpen(false); setForm(empty); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blog_admin"] }); toast.success("Deleted"); },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Blog" description="Manage your storefront blog posts" />
      <div className="flex justify-end">
        <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />New Post</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {posts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No posts yet</TableCell></TableRow>}
            {posts.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                <TableCell><Badge variant={p.is_published ? "default" : "secondary"}>{p.is_published ? "Published" : "Draft"}</Badge></TableCell>
                <TableCell className="text-sm">{p.published_at ? new Date(p.published_at).toLocaleDateString() : "-"}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setForm(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this post?")) remove.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit Post" : "New Post"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div><Label>Cover image URL</Label><Input value={form.cover_url || ""} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} /></div>
            <div><Label>Author</Label><Input value={form.author_name || ""} onChange={(e) => setForm({ ...form, author_name: e.target.value })} /></div>
            <div><Label>Excerpt</Label><Textarea rows={2} value={form.excerpt || ""} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
            <div><Label>Content</Label><Textarea rows={10} value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            <label className="flex items-center gap-2"><Switch checked={!!form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /> Published</label>
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