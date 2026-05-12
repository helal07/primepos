import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

export default function StoreSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({ enabled: false, theme: "default", currency: "BDT", enable_cod: true });
  const [tenantSlug, setTenantSlug] = useState<string>("");
  const [tenantDomain, setTenantDomain] = useState<string>("");
  const [domainVerifiedAt, setDomainVerifiedAt] = useState<string | null>(null);
  const [savingDomain, setSavingDomain] = useState(false);

  const { data: tenantId } = useQuery({
    queryKey: ["my_tenant", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("tenant_id").eq("user_id", user!.id).maybeSingle();
      if (data?.tenant_id) {
        const { data: t } = await supabase.from("tenants").select("slug, domain, domain_verified_at").eq("id", data.tenant_id).maybeSingle();
        setTenantSlug(t?.slug ?? "");
        setTenantDomain((t as any)?.domain ?? "");
        setDomainVerifiedAt((t as any)?.domain_verified_at ?? null);
      }
      return data?.tenant_id ?? null;
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["store_settings_admin", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("*").eq("tenant_id", tenantId!).maybeSingle();
      return data;
    },
  });

  useEffect(() => { if (existing) setForm(existing); }, [existing]);

  const save = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const payload = { ...form, tenant_id: tenantId };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      if (existing?.id) {
        const { error } = await supabase.from("store_settings").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["store_settings_admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const storefrontUrl = tenantDomain ? `https://${tenantDomain}` : (tenantSlug ? `${window.location.origin}/store/${tenantSlug}` : null);

  const saveDomain = async () => {
    if (!tenantId) return;
    setSavingDomain(true);
    const cleaned = tenantDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const { error } = await supabase.from("tenants").update({ domain: cleaned || null, domain_verified_at: null }).eq("id", tenantId);
    setSavingDomain(false);
    if (error) toast.error(error.message); else { toast.success("Domain saved"); setTenantDomain(cleaned); setDomainVerifiedAt(null); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Store Settings" description="Configure your public storefront" actions={
        storefrontUrl && <Button asChild variant="outline"><a href={storefrontUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />View store</a></Button>
      } />

      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Store enabled</Label>
              <p className="text-sm text-muted-foreground">When off, your storefront URL shows an offline message.</p>
            </div>
            <Switch checked={!!form.enabled} onCheckedChange={(v) => set("enabled", v)} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Store name</Label><Input value={form.store_name ?? ""} onChange={(e) => set("store_name", e.target.value)} /></div>
            <div><Label>Tagline</Label><Input value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} /></div>
            <div><Label>Currency</Label><Input value={form.currency ?? "BDT"} onChange={(e) => set("currency", e.target.value)} /></div>
            <div><Label>Theme</Label><Input value={form.theme ?? "default"} onChange={(e) => set("theme", e.target.value)} placeholder="default | fashion (coming)" /></div>
            <div><Label>Logo URL</Label><Input value={form.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} /></div>
            <div><Label>Banner URL</Label><Input value={form.banner_url ?? ""} onChange={(e) => set("banner_url", e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Custom domain</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="shop.example.com"
              value={tenantDomain}
              onChange={(e) => setTenantDomain(e.target.value)}
            />
            <Button onClick={saveDomain} disabled={savingDomain}>{savingDomain ? "Saving…" : "Save domain"}</Button>
          </div>
          {tenantDomain && (
            <p className="text-xs">
              Status:{" "}
              {domainVerifiedAt
                ? <span className="text-green-600 font-medium">Verified ({new Date(domainVerifiedAt).toLocaleDateString()})</span>
                : <span className="text-amber-600 font-medium">Pending DNS</span>}
            </p>
          )}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Point your domain to our hosting and visitors will land on your storefront. <code>{tenantDomain || "yourdomain.com"}/login</code> opens your admin panel.</p>
            <p><strong>DNS records to add at your registrar:</strong></p>
            <pre className="bg-muted p-2 rounded text-[11px] leading-snug overflow-x-auto">
A    @     185.158.133.1{"\n"}A    www   185.158.133.1
            </pre>
            <p>SSL is provisioned automatically once DNS resolves (allow up to 72 h).</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hero</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Heading</Label><Input value={form.hero_heading ?? ""} onChange={(e) => set("hero_heading", e.target.value)} /></div>
          <div><Label>Subheading</Label><Textarea value={form.hero_subheading ?? ""} onChange={(e) => set("hero_subheading", e.target.value)} /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>CTA label</Label><Input value={form.hero_cta_label ?? ""} onChange={(e) => set("hero_cta_label", e.target.value)} /></div>
            <div><Label>CTA URL</Label><Input value={form.hero_cta_url ?? ""} onChange={(e) => set("hero_cta_url", e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact & social</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div><Label>Email</Label><Input value={form.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.contact_phone ?? ""} onChange={(e) => set("contact_phone", e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Address</Label><Textarea value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
          <div><Label>Facebook URL</Label><Input value={form.facebook_url ?? ""} onChange={(e) => set("facebook_url", e.target.value)} /></div>
          <div><Label>Instagram URL</Label><Input value={form.instagram_url ?? ""} onChange={(e) => set("instagram_url", e.target.value)} /></div>
          <div><Label>WhatsApp number</Label><Input value={form.whatsapp_number ?? ""} onChange={(e) => set("whatsapp_number", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Meta title</Label><Input value={form.meta_title ?? ""} onChange={(e) => set("meta_title", e.target.value)} /></div>
          <div><Label>Meta description</Label><Textarea value={form.meta_description ?? ""} onChange={(e) => set("meta_description", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment & shipping (Phase 2+)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><Label>Cash on delivery</Label><Switch checked={!!form.enable_cod} onCheckedChange={(v) => set("enable_cod", v)} /></div>
          <div className="flex items-center justify-between"><Label>SSLCommerz</Label><Switch checked={!!form.enable_sslcommerz} onCheckedChange={(v) => set("enable_sslcommerz", v)} /></div>
          <div className="flex items-center justify-between"><Label>bKash</Label><Switch checked={!!form.enable_bkash} onCheckedChange={(v) => set("enable_bkash", v)} /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Flat shipping rate</Label><Input type="number" value={form.shipping_flat_rate ?? 0} onChange={(e) => set("shipping_flat_rate", Number(e.target.value))} /></div>
            <div><Label>Free shipping above</Label><Input type="number" value={form.free_shipping_threshold ?? ""} onChange={(e) => set("free_shipping_threshold", e.target.value === "" ? null : Number(e.target.value))} /></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save settings"}</Button></div>
    </div>
  );
}
