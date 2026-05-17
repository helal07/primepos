import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings, useSaveSetting } from "@/hooks/useSettings";
import { ThemePicker } from "@/components/settings/ThemePicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, Smartphone, Building2, Receipt, Percent, Bell, Palette, Package, Users, ShoppingCart, ShoppingBag, CreditCard, LayoutDashboard, Settings as SettingsIcon, Hash, Mail, MessageSquare, Tag } from "lucide-react";
import { compressImage } from "@/lib/compressImage";

function BusinessTab() {
  const { data: settings, isLoading } = useSettings();
  const saveSetting = useSaveSetting();
  const [form, setForm] = useState({
    company_name: "", phone: "", email: "", currency: "BDT", address: "",
    website: "", tax_number: "", logo_url: "",
  });

  useEffect(() => {
    if (settings?.business) setForm((f) => ({ ...f, ...settings.business }));
  }, [settings]);

  const handleSave = () => saveSetting.mutate({ key: "business", value: form });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Business Profile</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Company Name</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Prime POS" /></div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+880 1700 000000" /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@company.com" /></div>
          <div className="space-y-2"><Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BDT">BDT (৳)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="INR">INR (₹)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://company.com" /></div>
          <div className="space-y-2"><Label>Tax Number / TIN</Label><Input value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} /></div>
        </div>
        <div className="space-y-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></div>
        <Separator />
        <Button onClick={handleSave} disabled={saveSetting.isPending}>{saveSetting.isPending ? "Saving..." : "Save Changes"}</Button>
      </CardContent>
    </Card>
  );
}

function InvoiceTab() {
  const { data: settings, isLoading } = useSettings();
  const saveSetting = useSaveSetting();
  const [form, setForm] = useState({
    prefix: "INV-", next_number: "001001", footer_text: "Thank you for your business!",
    show_logo: true, show_tax: true, show_discount: true, show_shipping: true,
    terms: "", notes_label: "Notes", paper_size: "a4",
    // Template options
    template: "classic", header_position: "top",
    logo_size: "md", logo_shape: "square",
    font_family: "inter", heading_size: "md",
    accent_color: "#8b7cf6",
    header_image_url: "",
    show_business_address: true, show_business_phone: true,
    show_business_email: true, show_business_website: true, show_business_tax: true,
  });
  const headerFileRef = useRef<HTMLInputElement>(null);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [presets, setPresets] = useState<Array<{ name: string; settings: Record<string, any> }>>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [newPresetName, setNewPresetName] = useState<string>("");

  useEffect(() => {
    if (settings?.invoice) setForm((f) => ({ ...f, ...settings.invoice }));
    if (Array.isArray(settings?.invoice_presets)) setPresets(settings.invoice_presets);
  }, [settings]);

  const handleSave = () => saveSetting.mutate({ key: "invoice", value: form });

  const persistPresets = (next: Array<{ name: string; settings: Record<string, any> }>) => {
    setPresets(next);
    saveSetting.mutate({ key: "invoice_presets", value: next });
  };

  const handleSaveAsPreset = () => {
    const name = newPresetName.trim();
    if (!name) { toast.error("Enter a preset name"); return; }
    const next = [...presets.filter((p) => p.name !== name), { name, settings: { ...form } }];
    persistPresets(next);
    setNewPresetName("");
    setSelectedPreset(name);
    toast.success(`Preset "${name}" saved`);
  };

  const handleApplyPreset = (name: string) => {
    setSelectedPreset(name);
    const p = presets.find((x) => x.name === name);
    if (!p) return;
    setForm((f) => ({ ...f, ...p.settings }));
    toast.success(`Loaded "${name}"`);
  };

  const handleDeletePreset = () => {
    if (!selectedPreset) return;
    persistPresets(presets.filter((p) => p.name !== selectedPreset));
    setSelectedPreset("");
    toast.success("Preset deleted");
  };

  const handleHeaderUpload = async (file: File) => {
    setUploadingHeader(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `invoice-header/invoice-header-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      setForm((f) => ({ ...f, header_image_url: data.publicUrl }));
      toast.success("Header image uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploadingHeader(false);
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const fontMap: Record<string, string> = {
    inter: "Inter, sans-serif", roboto: "Roboto, sans-serif",
    lato: "Lato, sans-serif", poppins: "Poppins, sans-serif",
    serif: "Georgia, serif", mono: "ui-monospace, monospace",
  };
  const logoSizePx: Record<string, number> = { sm: 50, md: 70, lg: 100 };
  const logoRadius: Record<string, string> = { square: "4px", rounded: "12px", circle: "50%" };
  const headingPx: Record<string, number> = { sm: 18, md: 22, lg: 28 };
  const hexToRgba = (hex: string, a: number) => {
    const m = hex.replace("#", "");
    const r = parseInt(m.substring(0, 2), 16); const g = parseInt(m.substring(2, 4), 16); const b = parseInt(m.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };
  const accent = form.accent_color || "#8b7cf6";
  const band = hexToRgba(accent, 0.15);
  const logoSize = logoSizePx[form.logo_size] || 70;
  const headingSize = headingPx[form.heading_size] || 22;
  const fontFam = fontMap[form.font_family] || fontMap.inter;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Invoice Settings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Invoice Prefix</Label><Input value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} /></div>
          <div className="space-y-2"><Label>Next Invoice Number</Label><Input value={form.next_number} onChange={(e) => setForm({ ...form, next_number: e.target.value })} /></div>
          <div className="space-y-2"><Label>Paper Size</Label>
            <Select value={form.paper_size} onValueChange={(v) => setForm({ ...form, paper_size: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4</SelectItem>
                <SelectItem value="letter">Letter</SelectItem>
                <SelectItem value="a5">A5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Notes Label</Label><Input value={form.notes_label} onChange={(e) => setForm({ ...form, notes_label: e.target.value })} /></div>
        </div>
        <div className="space-y-2"><Label>Footer Text</Label><Input value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} /></div>
        <div className="space-y-2"><Label>Terms & Conditions</Label><Textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} rows={3} /></div>

        <Separator />
        <div className="space-y-3">
          <div className="text-sm font-semibold">Invoice Template</div>
          <div className="rounded-md border bg-muted/40 p-3 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Template Presets</Label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[200px] flex-1">
                <Select value={selectedPreset} onValueChange={handleApplyPreset}>
                  <SelectTrigger><SelectValue placeholder={presets.length ? "Load a preset..." : "No presets saved"} /></SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={!selectedPreset} onClick={handleDeletePreset}>Delete</Button>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="New preset name (e.g. Main Branch)" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} />
              <Button type="button" size="sm" onClick={handleSaveAsPreset}>Save as Preset</Button>
            </div>
            <p className="text-xs text-muted-foreground">Presets capture the full template (layout, colors, fonts, header image, field toggles). Save the current configuration, then switch between named layouts instantly.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Template Layout</Label>
              <Select value={form.template} onValueChange={(v) => setForm({ ...form, template: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic (Logo Left)</SelectItem>
                  <SelectItem value="centered">Centered</SelectItem>
                  <SelectItem value="modern">Modern (Logo Right)</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Header Position</Label>
              <Select value={form.header_position} onValueChange={(v) => setForm({ ...form, header_position: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top (Plain)</SelectItem>
                  <SelectItem value="top-band">Top Color Band</SelectItem>
                  <SelectItem value="boxed">Boxed / Bordered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Accent Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={accent} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="h-9 w-12 rounded border" />
                <Input value={accent} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2"><Label>Logo Size</Label>
              <Select value={form.logo_size} onValueChange={(v) => setForm({ ...form, logo_size: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small (50px)</SelectItem>
                  <SelectItem value="md">Medium (70px)</SelectItem>
                  <SelectItem value="lg">Large (100px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Logo Shape</Label>
              <Select value={form.logo_shape} onValueChange={(v) => setForm({ ...form, logo_shape: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="rounded">Rounded</SelectItem>
                  <SelectItem value="circle">Circle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Font Family</Label>
              <Select value={form.font_family} onValueChange={(v) => setForm({ ...form, font_family: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inter">Inter</SelectItem>
                  <SelectItem value="roboto">Roboto</SelectItem>
                  <SelectItem value="lato">Lato</SelectItem>
                  <SelectItem value="poppins">Poppins</SelectItem>
                  <SelectItem value="serif">Serif (Georgia)</SelectItem>
                  <SelectItem value="mono">Monospace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Heading Size</Label>
              <Select value={form.heading_size} onValueChange={(v) => setForm({ ...form, heading_size: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small (18px)</SelectItem>
                  <SelectItem value="md">Medium (22px)</SelectItem>
                  <SelectItem value="lg">Large (28px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom Header Image (optional)</Label>
            <p className="text-xs text-muted-foreground">Upload a full-width banner image (JPEG recommended, ~1600×300px). When set, it replaces the auto-generated header. Different business locations can upload their own.</p>
            <div className="flex items-center gap-2">
              <Input value={form.header_image_url} onChange={(e) => setForm({ ...form, header_image_url: e.target.value })} placeholder="https://..." />
              <input ref={headerFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeaderUpload(f); e.target.value = ""; }} />
              <Button type="button" variant="outline" size="sm" disabled={uploadingHeader} onClick={() => headerFileRef.current?.click()}>
                {uploadingHeader ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />} Upload
              </Button>
              {form.header_image_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, header_image_url: "" })}>Clear</Button>
              )}
            </div>
            {form.header_image_url && (
              <img src={form.header_image_url} alt="Header preview" className="mt-2 max-h-24 rounded border" />
            )}
          </div>
        </div>

        <Separator />
        <div className="text-sm font-semibold">Show / Hide Fields</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2"><Switch checked={form.show_logo} onCheckedChange={(v) => setForm({ ...form, show_logo: v })} /><Label>Show Logo</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.show_tax} onCheckedChange={(v) => setForm({ ...form, show_tax: v })} /><Label>Show Tax</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.show_discount} onCheckedChange={(v) => setForm({ ...form, show_discount: v })} /><Label>Show Discount</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.show_shipping} onCheckedChange={(v) => setForm({ ...form, show_shipping: v })} /><Label>Show Shipping</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.show_business_address} onCheckedChange={(v) => setForm({ ...form, show_business_address: v })} /><Label>Address</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.show_business_phone} onCheckedChange={(v) => setForm({ ...form, show_business_phone: v })} /><Label>Phone</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.show_business_email} onCheckedChange={(v) => setForm({ ...form, show_business_email: v })} /><Label>Email</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.show_business_website} onCheckedChange={(v) => setForm({ ...form, show_business_website: v })} /><Label>Website</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.show_business_tax} onCheckedChange={(v) => setForm({ ...form, show_business_tax: v })} /><Label>TIN/VAT</Label></div>
        </div>

        <Separator />
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Live Preview</Label>
          <div className="rounded-lg border bg-white p-4" style={{ fontFamily: fontFam }}>
            {form.header_image_url ? (
              <img src={form.header_image_url} alt="" className="w-full max-h-32 object-contain" />
            ) : (
              <div style={{
                background: form.header_position === "top-band" ? accent : "transparent",
                color: form.header_position === "top-band" ? "#fff" : "#1f2937",
                border: form.header_position === "boxed" ? `1px solid ${accent}` : "none",
                padding: form.header_position === "top" ? "0" : "12px",
                borderRadius: form.header_position === "boxed" ? "8px" : "0",
                display: "grid",
                gridTemplateColumns: form.template === "centered" ? "1fr"
                  : form.template === "modern" ? `1fr ${logoSize + 10}px`
                  : form.template === "compact" ? `${logoSize + 10}px 1fr`
                  : `${logoSize + 10}px 1fr`,
                gap: "12px", alignItems: "center",
                textAlign: form.template === "centered" ? "center" : (form.template === "modern" ? "left" : "left"),
              }}>
                {form.template === "modern" ? (
                  <>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: headingSize }}>{(settings?.business as any)?.company_name || "Your Business"}</div>
                      <div style={{ fontSize: 11, opacity: 0.85 }}>Sample address · Phone · email@example.com</div>
                    </div>
                    <div style={{ width: logoSize, height: logoSize, background: band, borderRadius: logoRadius[form.logo_shape], display: "flex", alignItems: "center", justifyContent: "center", color: accent, fontSize: 10, fontWeight: "bold" }}>LOGO</div>
                  </>
                ) : form.template === "centered" ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: logoSize, height: logoSize, background: band, borderRadius: logoRadius[form.logo_shape], display: "flex", alignItems: "center", justifyContent: "center", color: accent, fontSize: 10, fontWeight: "bold" }}>LOGO</div>
                    <div style={{ fontWeight: "bold", fontSize: headingSize }}>{(settings?.business as any)?.company_name || "Your Business"}</div>
                    <div style={{ fontSize: 11, opacity: 0.85 }}>Sample address · Phone · email@example.com</div>
                  </div>
                ) : (
                  <>
                    <div style={{ width: logoSize, height: logoSize, background: band, borderRadius: logoRadius[form.logo_shape], display: "flex", alignItems: "center", justifyContent: "center", color: accent, fontSize: 10, fontWeight: "bold" }}>LOGO</div>
                    <div style={{ textAlign: form.template === "compact" ? "left" : "right" }}>
                      <div style={{ fontWeight: "bold", fontSize: headingSize }}>{(settings?.business as any)?.company_name || "Your Business"}</div>
                      <div style={{ fontSize: 11, opacity: 0.85 }}>Sample address · Phone · email@example.com</div>
                    </div>
                  </>
                )}
              </div>
            )}
            <div style={{ background: band, color: accent, textAlign: "center", padding: "4px 0", fontStyle: "italic", fontWeight: 600, marginTop: 8, fontSize: 11 }}>Invoice</div>
          </div>
        </div>

        <Separator />
        <Button onClick={handleSave} disabled={saveSetting.isPending}>{saveSetting.isPending ? "Saving..." : "Save Changes"}</Button>
      </CardContent>
    </Card>
  );
}

function TaxTab() {
  const { data: settings, isLoading } = useSettings();
  const saveSetting = useSaveSetting();
  const [form, setForm] = useState({
    tax_enabled: true, default_tax_rate: "0", tax_name: "VAT", tax_number_label: "TIN",
    prices_include_tax: false, compound_tax: false,
  });

  useEffect(() => {
    if (settings?.tax) setForm((f) => ({ ...f, ...settings.tax }));
  }, [settings]);

  const handleSave = () => saveSetting.mutate({ key: "tax", value: form });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Tax Configuration</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch checked={form.tax_enabled} onCheckedChange={(v) => setForm({ ...form, tax_enabled: v })} />
          <Label>Enable Tax</Label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Tax Name</Label><Input value={form.tax_name} onChange={(e) => setForm({ ...form, tax_name: e.target.value })} placeholder="VAT / GST / Sales Tax" /></div>
          <div className="space-y-2"><Label>Default Tax Rate (%)</Label><Input type="number" value={form.default_tax_rate} onChange={(e) => setForm({ ...form, default_tax_rate: e.target.value })} /></div>
          <div className="space-y-2"><Label>Tax Number Label</Label><Input value={form.tax_number_label} onChange={(e) => setForm({ ...form, tax_number_label: e.target.value })} placeholder="TIN / VAT No / GST No" /></div>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.prices_include_tax} onCheckedChange={(v) => setForm({ ...form, prices_include_tax: v })} />
          <Label>Prices include tax</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.compound_tax} onCheckedChange={(v) => setForm({ ...form, compound_tax: v })} />
          <Label>Compound tax (tax on tax)</Label>
        </div>
        <Separator />
        <Button onClick={handleSave} disabled={saveSetting.isPending}>{saveSetting.isPending ? "Saving..." : "Save Changes"}</Button>
      </CardContent>
    </Card>
  );
}

function NotificationsTab() {
  const { data: settings, isLoading } = useSettings();
  const saveSetting = useSaveSetting();
  const [form, setForm] = useState({
    email_on_sale: true, email_on_purchase: false, email_on_low_stock: true,
    sms_on_sale: false, sms_on_purchase: false,
    whatsapp_enabled: false,
    smtp_host: "", smtp_port: "587", smtp_user: "", smtp_from: "",
    sms_provider: "none", sms_api_key: "",
  });

  useEffect(() => {
    if (settings?.notifications) setForm((f) => ({ ...f, ...settings.notifications }));
  }, [settings]);

  const handleSave = () => saveSetting.mutate({ key: "notifications", value: form });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3"><Switch checked={form.email_on_sale} onCheckedChange={(v) => setForm({ ...form, email_on_sale: v })} /><Label>Email on new sale</Label></div>
            <div className="flex items-center gap-3"><Switch checked={form.email_on_purchase} onCheckedChange={(v) => setForm({ ...form, email_on_purchase: v })} /><Label>Email on new purchase</Label></div>
            <div className="flex items-center gap-3"><Switch checked={form.email_on_low_stock} onCheckedChange={(v) => setForm({ ...form, email_on_low_stock: v })} /><Label>Email on low stock</Label></div>
            <div className="flex items-center gap-3"><Switch checked={form.sms_on_sale} onCheckedChange={(v) => setForm({ ...form, sms_on_sale: v })} /><Label>SMS on new sale</Label></div>
            <div className="flex items-center gap-3"><Switch checked={form.sms_on_purchase} onCheckedChange={(v) => setForm({ ...form, sms_on_purchase: v })} /><Label>SMS on new purchase</Label></div>
            <div className="flex items-center gap-3"><Switch checked={form.whatsapp_enabled} onCheckedChange={(v) => setForm({ ...form, whatsapp_enabled: v })} /><Label>WhatsApp notifications</Label></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Email (SMTP) Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>SMTP Host</Label><Input value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} placeholder="smtp.gmail.com" /></div>
            <div className="space-y-2"><Label>SMTP Port</Label><Input value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: e.target.value })} /></div>
            <div className="space-y-2"><Label>SMTP Username</Label><Input value={form.smtp_user} onChange={(e) => setForm({ ...form, smtp_user: e.target.value })} /></div>
            <div className="space-y-2"><Label>From Email</Label><Input value={form.smtp_from} onChange={(e) => setForm({ ...form, smtp_from: e.target.value })} placeholder="noreply@company.com" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">SMS Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>SMS Provider</Label>
              <Select value={form.sms_provider} onValueChange={(v) => setForm({ ...form, sms_provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="bulksms">BulkSMS BD</SelectItem>
                  <SelectItem value="custom">Custom API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>API Key</Label><Input type="password" value={form.sms_api_key} onChange={(e) => setForm({ ...form, sms_api_key: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saveSetting.isPending}>{saveSetting.isPending ? "Saving..." : "Save All Notification Settings"}</Button>
    </div>
  );
}

function PwaTab() {
  const { data: settings, isLoading } = useSettings();
  const saveSetting = useSaveSetting();
  const [form, setForm] = useState({
    name: "Prime POS",
    short_name: "Prime POS",
    description: "POS, Inventory, Accounts & ERP",
    theme_color: "#0369a1",
    background_color: "#0f172a",
    icon_url: "",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings?.pwa) setForm((f) => ({ ...f, ...settings.pwa }));
  }, [settings]);

  const onIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    if (!original) return;
    if (original.size > 5 * 1024 * 1024) return toast.error("Icon must be under 5MB");
    if (!original.type.startsWith("image/")) return toast.error("Please choose an image");
    setUploading(true);
    const file = await compressImage(original, { maxWidth: 512, maxHeight: 512, quality: 0.9, mimeType: "image/jpeg" });
    const ext = file.name.split(".").pop();
    const path = `pwa/icon-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data: { publicUrl } } = supabase.storage.from("branding").getPublicUrl(path);
    setForm((f) => ({ ...f, icon_url: publicUrl }));
    setUploading(false);
    toast.success("Icon uploaded — click Save to apply");
    e.target.value = "";
  };

  const handleSave = () => saveSetting.mutate({ key: "pwa", value: form });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> Mobile App (PWA) Branding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>App Name</Label>
            <Input value={form.name} maxLength={60}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="My Shop POS" />
          </div>
          <div className="space-y-2">
            <Label>Short Name (home screen)</Label>
            <Input value={form.short_name} maxLength={30}
              onChange={(e) => setForm({ ...form, short_name: e.target.value })}
              placeholder="MyShop" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Input value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Theme Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.theme_color}
                onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
                className="h-10 w-14 rounded border bg-transparent" />
              <Input value={form.theme_color}
                onChange={(e) => setForm({ ...form, theme_color: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Background Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.background_color}
                onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                className="h-10 w-14 rounded border bg-transparent" />
              <Input value={form.background_color}
                onChange={(e) => setForm({ ...form, background_color: e.target.value })} />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>App Icon (square PNG, 512x512 recommended)</Label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-2xl border bg-muted/30 overflow-hidden flex items-center justify-center">
              {form.icon_url
                ? <img src={form.icon_url} alt="App icon" className="h-full w-full object-cover" />
                : <span className="text-xs text-muted-foreground">No icon</span>}
            </div>
            <label htmlFor="pwa-icon" className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-background hover:bg-muted cursor-pointer text-sm">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload Icon"}
              <input id="pwa-icon" type="file" accept="image/png,image/jpeg,image/webp"
                className="hidden" onChange={onIcon} disabled={uploading} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Existing installed apps won't update automatically — users must reinstall to see new branding.
          </p>
        </div>

        <Separator />
        <Button onClick={handleSave} disabled={saveSetting.isPending}>
          {saveSetting.isPending ? "Saving..." : "Save PWA Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Settings for this section will appear here.
        </p>
      </CardContent>
    </Card>
  );
}

const SETTINGS_SECTIONS = [
  { value: "business", label: "Business", icon: Building2 },
  { value: "tax", label: "Tax", icon: Percent },
  { value: "product", label: "Product", icon: Package },
  { value: "contact", label: "Contact", icon: Users },
  { value: "sale", label: "Sale", icon: ShoppingCart },
  { value: "pos", label: "POS", icon: CreditCard },
  { value: "purchases", label: "Purchases", icon: ShoppingBag },
  { value: "payment", label: "Payment", icon: CreditCard },
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "system", label: "System", icon: SettingsIcon },
  { value: "prefixes", label: "Prefixes", icon: Hash },
  { value: "email", label: "Email Settings", icon: Mail },
  { value: "sms", label: "SMS Settings", icon: MessageSquare },
  { value: "invoice", label: "Invoice", icon: Receipt },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "appearance", label: "Appearance", icon: Palette },
  { value: "pwa", label: "Mobile App", icon: Smartphone },
  { value: "custom_labels", label: "Custom Labels", icon: Tag },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure your business settings" />
      <Tabs
        defaultValue="business"
        orientation="vertical"
        className="flex flex-col md:flex-row gap-6 items-start"
      >
        <TabsList
          className="
            w-full md:w-64 md:flex-col md:h-auto md:items-stretch
            flex md:gap-1 gap-1 p-2 bg-card border rounded-xl
            overflow-x-auto md:overflow-visible
          "
        >
          {SETTINGS_SECTIONS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="
                shrink-0 md:w-full justify-start gap-2 rounded-lg px-3 py-2 text-sm
                data-[state=active]:bg-primary data-[state=active]:text-primary-foreground
                data-[state=active]:shadow-sm
              "
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 w-full min-w-0">
          <TabsContent value="business" className="mt-0"><BusinessTab /></TabsContent>
          <TabsContent value="tax" className="mt-0"><TaxTab /></TabsContent>
          <TabsContent value="product" className="mt-0"><ComingSoon title="Product Settings" /></TabsContent>
          <TabsContent value="contact" className="mt-0"><ComingSoon title="Contact Settings" /></TabsContent>
          <TabsContent value="sale" className="mt-0"><ComingSoon title="Sale Settings" /></TabsContent>
          <TabsContent value="pos" className="mt-0"><ComingSoon title="POS Settings" /></TabsContent>
          <TabsContent value="purchases" className="mt-0"><ComingSoon title="Purchases Settings" /></TabsContent>
          <TabsContent value="payment" className="mt-0"><ComingSoon title="Payment Settings" /></TabsContent>
          <TabsContent value="dashboard" className="mt-0"><ComingSoon title="Dashboard Settings" /></TabsContent>
          <TabsContent value="system" className="mt-0"><ComingSoon title="System Settings" /></TabsContent>
          <TabsContent value="prefixes" className="mt-0"><ComingSoon title="Prefixes" /></TabsContent>
          <TabsContent value="email" className="mt-0"><ComingSoon title="Email Settings" /></TabsContent>
          <TabsContent value="sms" className="mt-0"><ComingSoon title="SMS Settings" /></TabsContent>
          <TabsContent value="invoice" className="mt-0"><InvoiceTab /></TabsContent>
          <TabsContent value="notifications" className="mt-0"><NotificationsTab /></TabsContent>
          <TabsContent value="appearance" className="mt-0">
            <Card><CardContent className="pt-6"><ThemePicker /></CardContent></Card>
          </TabsContent>
          <TabsContent value="pwa" className="mt-0"><PwaTab /></TabsContent>
          <TabsContent value="custom_labels" className="mt-0"><ComingSoon title="Custom Labels" /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
