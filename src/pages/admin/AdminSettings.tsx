import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useLandingCms, useLandingCmsMutation } from "@/hooks/useSaasAdmin";
import { Save } from "lucide-react";
import { ThemePicker } from "@/components/settings/ThemePicker";
import PaymentGateways from "./PaymentGateways";
import Sitemap from "./Sitemap";

function GatewayCard({ settingsKey, title, fields }: {
  settingsKey: string; title: string;
  fields: { name: string; label: string; type?: string }[];
}) {
  const { data } = useLandingCms(settingsKey);
  const mutation = useLandingCmsMutation();
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data && typeof data === "object") setValues(data as Record<string, any>);
  }, [data]);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-foreground">{title}</h4>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Enabled</Label>
          <Switch checked={!!values.enabled} onCheckedChange={(v) => setValues({ ...values, enabled: v })} />
        </div>
      </div>
      {fields.map((f) => (
        <div key={f.name}>
          <Label className="text-foreground/90">{f.label}</Label>
          <Input className="bg-muted border-border text-foreground" type={f.type ?? "text"} value={values[f.name] ?? ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
        </div>
      ))}
      <Button size="sm" className="bg-primary hover:bg-primary/90 text-foreground" onClick={() => mutation.mutate({ key: settingsKey, value: values })} disabled={mutation.isPending}>
        <Save className="h-4 w-4 mr-1" /> Save
      </Button>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <PageHeader title="SaaS Settings" subtitle="Configure payment gateways and SMS providers" />

      <Tabs defaultValue="payment">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="payment">Payment Gateways</TabsTrigger>
          <TabsTrigger value="sms">SMS Gateways</TabsTrigger>
          <TabsTrigger value="email">Email Gateway</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="mt-4 space-y-4">
          <PaymentGateways />
        </TabsContent>

        <TabsContent value="sms" className="mt-4 space-y-4">
          <GatewayCard settingsKey="sms_bulksmsbd" title="BulkSMS BD" fields={[
            { name: "api_key", label: "API Key" }, { name: "sender_id", label: "Sender ID" },
          ]} />
          <GatewayCard settingsKey="sms_mimsms" title="MIM SMS" fields={[
            { name: "api_key", label: "API Key" }, { name: "sender_id", label: "Sender ID" },
          ]} />
        </TabsContent>

        <TabsContent value="email" className="mt-4 space-y-4">
          <GatewayCard settingsKey="email_smtp" title="SMTP Email" fields={[
            { name: "host", label: "SMTP Host (e.g. smtp.gmail.com)" },
            { name: "port", label: "Port (587 / 465)" },
            { name: "username", label: "Username" },
            { name: "password", label: "Password / App Password", type: "password" },
            { name: "from_email", label: "From Email" },
            { name: "from_name", label: "From Name" },
            { name: "secure", label: "Use SSL (true / false)" },
          ]} />
          <p className="text-xs text-muted-foreground px-1">
            Used for trial reminder emails (7, 3, 1 days before expiry &amp; on expiry day). Save credentials and toggle &quot;Enabled&quot; to start sending.
          </p>
        </TabsContent>

        <TabsContent value="appearance" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <ThemePicker />
          </div>
        </TabsContent>

        <TabsContent value="sitemap" className="mt-4">
          <Sitemap />
        </TabsContent>
      </Tabs>
    </div>
  );
}
