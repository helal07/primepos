import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Gateway {
  id: string;
  provider: string;
  display_name: string;
  mode: string;
  active: boolean;
  visible: boolean;
}

const FIELDS: Record<string, { key: string; label: string; secret?: boolean }[]> = {
  bkash: [
    { key: "app_key", label: "App Key" },
    { key: "app_secret", label: "App Secret", secret: true },
    { key: "username", label: "Username" },
    { key: "password", label: "Password", secret: true },
  ],
  eps: [
    { key: "merchant_id", label: "Merchant ID" },
    { key: "store_id", label: "Store ID" },
    { key: "username", label: "Username" },
    { key: "password", label: "Password", secret: true },
    { key: "hash_key", label: "Hash Key", secret: true },
  ],
};

export default function PaymentGateways() {
  const { toast } = useToast();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [creds, setCreds] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: gws } = await supabase.from("payment_gateways").select("*").order("sort_order");
    const { data: credRows } = await supabase.from("payment_gateway_credentials").select("*");
    setGateways((gws ?? []) as Gateway[]);
    const map: Record<string, Record<string, string>> = {};
    (credRows ?? []).forEach((r: any) => { map[r.gateway_id] = r.config ?? {}; });
    setCreds(map);
    setLoading(false);
  };

  useEffect(() => { document.title = "Payment Gateways"; load(); }, []);

  const save = async (gw: Gateway) => {
    setSavingId(gw.id);
    try {
      await supabase.from("payment_gateways").update({
        active: gw.active, visible: gw.visible, mode: gw.mode, display_name: gw.display_name,
      }).eq("id", gw.id);
      const config = creds[gw.id] ?? {};
      const { data: existing } = await supabase.from("payment_gateway_credentials")
        .select("gateway_id").eq("gateway_id", gw.id).maybeSingle();
      if (existing) {
        await supabase.from("payment_gateway_credentials").update({ config }).eq("gateway_id", gw.id);
      } else {
        await supabase.from("payment_gateway_credentials").insert({ gateway_id: gw.id, config });
      }
      toast({ title: `${gw.display_name} saved` });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSavingId(null); }
  };

  const update = (id: string, patch: Partial<Gateway>) =>
    setGateways(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  const updateCred = (id: string, key: string, value: string) =>
    setCreds(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), [key]: value } }));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Payment gateways</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Configure bKash and EPS credentials. Tenants pay through gateways marked active.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {gateways.map(gw => {
          const fields = FIELDS[gw.provider] ?? [];
          const c = creds[gw.id] ?? {};
          return (
            <Card key={gw.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base capitalize">{gw.display_name}</CardTitle>
                  <Switch checked={gw.active} onCheckedChange={(v) => update(gw.id, { active: v })} />
                </div>
                <CardDescription>Provider: {gw.provider}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mode</Label>
                    <Select value={gw.mode} onValueChange={(v) => update(gw.id, { mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Visible to tenants</Label>
                    <div className="flex h-10 items-center">
                      <Switch checked={gw.visible} onCheckedChange={(v) => update(gw.id, { visible: v })} />
                    </div>
                  </div>
                </div>
                {fields.map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      type={f.secret ? "password" : "text"}
                      value={c[f.key] ?? ""}
                      onChange={(e) => updateCred(gw.id, f.key, e.target.value)}
                      placeholder={f.secret ? "•••••••" : ""}
                    />
                  </div>
                ))}
                <Button onClick={() => save(gw)} disabled={savingId === gw.id} className="w-full">
                  {savingId === gw.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save {gw.display_name}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}