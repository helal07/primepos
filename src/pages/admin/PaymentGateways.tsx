import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Gateway {
  id: string;
  code: string;
  provider: string;
  display_name: string;
  mode: string;
  active: boolean;
  visible: boolean;
  instructions?: string | null;
  config: Record<string, string>;
}

const FIELDS: Record<string, { key: string; label: string; secret?: boolean }[]> = {
  bkash: [
    { key: "app_key", label: "App Key" },
    { key: "app_secret", label: "App Secret", secret: true },
    { key: "username", label: "Merchant Username" },
    { key: "password", label: "Merchant Password", secret: true },
    { key: "base_url", label: "Base URL (optional — auto by mode)" },
  ],
  sslcommerz: [
    { key: "store_id", label: "Store ID" },
    { key: "store_passwd", label: "Store Password", secret: true },
  ],
  eps: [
    { key: "merchant_id", label: "Merchant ID" },
    { key: "store_id", label: "Store ID" },
    { key: "username", label: "Username" },
    { key: "password", label: "Password", secret: true },
    { key: "hash_key", label: "Hash Key", secret: true },
    { key: "base_url", label: "Base URL (optional — auto by mode)" },
  ],
};

export default function PaymentGateways() {
  const { toast } = useToast();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Gateway[] }>("/api/admin/payment-gateways");
      setGateways(res?.data ?? []);
    } catch (e: any) {
      toast({ title: "Could not load gateways", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { document.title = "Payment Gateways"; load(); }, []);

  const save = async (gw: Gateway) => {
    setSavingId(gw.id);
    try {
      await api.patch(`/api/admin/payment-gateways/${gw.id}`, {
        display_name: gw.display_name,
        mode: gw.mode,
        active: gw.active,
        visible: gw.visible,
        instructions: gw.instructions ?? null,
        config: gw.config ?? {},
      });
      toast({ title: `${gw.display_name} saved` });
      load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSavingId(null); }
  };

  const update = (id: string, patch: Partial<Gateway>) =>
    setGateways(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  const updateCred = (id: string, key: string, value: string) =>
    setGateways(prev => prev.map(g => g.id === id ? { ...g, config: { ...(g.config ?? {}), [key]: value } } : g));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Payment gateways</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Configure bKash Merchant, SSLCommerz and EPS credentials. Tenants can pay with gateways that are both
          active and visible; packages activate automatically once a payment is verified.
        </p>
      </div>

      {gateways.length === 0 && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          No gateways found. Run backend migrations to seed bKash, SSLCommerz and EPS.
        </CardContent></Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {gateways.map(gw => {
          const fields = FIELDS[gw.provider] ?? FIELDS[gw.code] ?? [];
          const c = gw.config ?? {};
          return (
            <Card key={gw.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base capitalize">{gw.display_name}</CardTitle>
                  <Switch checked={gw.active} onCheckedChange={(v) => update(gw.id, { active: v })} />
                </div>
                <CardDescription>Code: {gw.code}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mode</Label>
                    <Select value={gw.mode ?? "sandbox"} onValueChange={(v) => update(gw.id, { mode: v })}>
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
                <div className="space-y-1.5">
                  <Label className="text-xs">Display name</Label>
                  <Input value={gw.display_name ?? ""} onChange={(e) => update(gw.id, { display_name: e.target.value })} />
                </div>
                {fields.map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      type={f.secret ? "password" : "text"}
                      value={c[f.key] ?? ""}
                      onChange={(e) => updateCred(gw.id, f.key, e.target.value)}
                      placeholder={f.secret ? "•••••••• (leave blank to keep)" : ""}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label className="text-xs">Instructions shown to tenants (optional)</Label>
                  <Textarea rows={2} value={gw.instructions ?? ""} onChange={(e) => update(gw.id, { instructions: e.target.value })} />
                </div>
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
