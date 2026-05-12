import { useState, useEffect } from "react";
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
  });

  useEffect(() => {
    if (settings?.invoice) setForm((f) => ({ ...f, ...settings.invoice }));
  }, [settings]);

  const handleSave = () => saveSetting.mutate({ key: "invoice", value: form });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2"><Switch checked={form.show_logo} onCheckedChange={(v) => setForm({ ...form, show_logo: v })} /><Label>Show Logo</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.show_tax} onCheckedChange={(v) => setForm({ ...form, show_tax: v })} /><Label>Show Tax</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.show_discount} onCheckedChange={(v) => setForm({ ...form, show_discount: v })} /><Label>Show Discount</Label></div>
          <div className="flex items-center gap-2"><Switch checked={form.show_shipping} onCheckedChange={(v) => setForm({ ...form, show_shipping: v })} /><Label>Show Shipping</Label></div>
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

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure your business settings" />
      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="business"><BusinessTab /></TabsContent>
        <TabsContent value="invoice"><InvoiceTab /></TabsContent>
        <TabsContent value="tax"><TaxTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="appearance">
          <Card><CardContent className="pt-6"><ThemePicker /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
