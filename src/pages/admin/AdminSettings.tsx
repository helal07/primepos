import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { useLandingCms, useLandingCmsMutation } from "@/hooks/useSaasAdmin";
import { Save } from "lucide-react";

function GatewayCard({ settingsKey, title, fields }: {
  settingsKey: string;
  title: string;
  fields: { name: string; label: string; type?: string }[];
}) {
  const { data } = useLandingCms(settingsKey);
  const mutation = useLandingCmsMutation();
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data && typeof data === "object") setValues(data as Record<string, any>);
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Enabled</Label>
            <Switch checked={!!values.enabled} onCheckedChange={(v) => setValues({ ...values, enabled: v })} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map((f) => (
          <div key={f.name}>
            <Label>{f.label}</Label>
            <Input
              type={f.type ?? "text"}
              value={values[f.name] ?? ""}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
            />
          </div>
        ))}
        <Button size="sm" onClick={() => mutation.mutate({ key: settingsKey, value: values })} disabled={mutation.isPending}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <PageHeader title="SaaS Settings" subtitle="Configure payment gateways and SMS providers" />

      <Tabs defaultValue="payment">
        <TabsList>
          <TabsTrigger value="payment">Payment Gateways</TabsTrigger>
          <TabsTrigger value="sms">SMS Gateways</TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="mt-4 space-y-4">
          <GatewayCard
            settingsKey="gateway_bkash"
            title="bKash"
            fields={[
              { name: "app_key", label: "App Key" },
              { name: "app_secret", label: "App Secret", type: "password" },
              { name: "username", label: "Username" },
              { name: "password", label: "Password", type: "password" },
            ]}
          />
          <GatewayCard
            settingsKey="gateway_sslcommerz"
            title="SSLCommerz"
            fields={[
              { name: "store_id", label: "Store ID" },
              { name: "store_passwd", label: "Store Password", type: "password" },
              { name: "mode", label: "Mode (sandbox/live)" },
            ]}
          />
          <GatewayCard
            settingsKey="gateway_eps"
            title="EPS"
            fields={[
              { name: "merchant_id", label: "Merchant ID" },
              { name: "api_key", label: "API Key", type: "password" },
            ]}
          />
        </TabsContent>

        <TabsContent value="sms" className="mt-4 space-y-4">
          <GatewayCard
            settingsKey="sms_bulksmsbd"
            title="BulkSMS BD"
            fields={[
              { name: "api_key", label: "API Key" },
              { name: "sender_id", label: "Sender ID" },
            ]}
          />
          <GatewayCard
            settingsKey="sms_mimsms"
            title="MIM SMS"
            fields={[
              { name: "api_key", label: "API Key" },
              { name: "sender_id", label: "Sender ID" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
