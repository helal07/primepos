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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

export default function StoreCollectionsAdmin() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ name: "", slug: "", is_active: true, is_featured: false, sort_order: 0 });

  const { data: tenantId } = useQuery({
    queryKey: ["my_tenant", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("tenant_id").eq("user_id", user!.id).maybeSingle();
      return data?.tenant_id ?? null;
    },
  });

  const { data: collections } = useQuery({
    queryKey: ["admin_collections", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("store_collections").select("*").eq("tenant_id", tenantId!).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["all_products_simple"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, image_url, show_on_website").order("name");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const payload = { ...form, tenant_id: tenantId };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      if (!payload.slug) payload.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (form.id) {
        const { error } = await supabase.from("store_collections").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_collections").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin_collections"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_collections"] }),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Store Collections" description="Group products for your storefront" actions={
        <Button onClick={() => { setForm({ name: "", slug: "", is_active: true, is_featured: false, sort_order: 0 }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />New collection</Button>
      } />
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead>Featured</TableHead><TableHead>Active</TableHead><TableHead className="w-32">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {(collections ?? []).map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">/{c.slug}</TableCell>
                <TableCell>{c.is_featured ? "Yes" : "No"}</TableCell>
                <TableCell>{c.is_active ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setProductsOpen(c.id)} title="Manage products"><Package className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { setForm(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!collections || collections.length === 0) && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No collections yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} collection</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto from name" /></div>
            <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Image URL</Label><Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Sort order</Label><Input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center justify-between"><Label>Featured on home</Label><Switch checked={!!form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} /></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {productsOpen && <CollectionProductsDialog collectionId={productsOpen} products={products ?? []} onClose={() => setProductsOpen(null)} />}
    </div>
  );
}

function CollectionProductsDialog({ collectionId, products, onClose }: { collectionId: string; products: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: links } = useQuery({
    queryKey: ["collection_links", collectionId],
    queryFn: async () => {
      const { data } = await supabase.from("store_collection_products").select("product_id").eq("collection_id", collectionId);
      return new Set((data ?? []).map((r: any) => r.product_id));
    },
  });
  const toggle = useMutation({
    mutationFn: async ({ productId, on }: { productId: string; on: boolean }) => {
      if (on) {
        const { error } = await supabase.from("store_collection_products").insert({ collection_id: collectionId, product_id: productId } as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_collection_products").delete().eq("collection_id", collectionId).eq("product_id", productId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collection_links", collectionId] }),
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Products in collection</DialogTitle></DialogHeader>
        <div className="space-y-1">
          {products.map((p) => {
            const on = links?.has(p.id) ?? false;
            return (
              <div key={p.id} className="flex items-center gap-3 p-2 border rounded">
                {p.image_url && <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  {!p.show_on_website && <p className="text-xs text-amber-600">Not visible on website</p>}
                </div>
                <Switch checked={on} onCheckedChange={(v) => toggle.mutate({ productId: p.id, on: v })} />
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
