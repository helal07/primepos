import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

type Provider = "pathao" | "steadfast";

const empty = {
  pathao: {
    is_active: true, is_default: false,
    pathao_base_url: "https://api-hermes.pathao.com",
    pathao_client_id: "", pathao_client_secret: "",
    pathao_username: "", pathao_password: "", pathao_store_id: "",
  },
  steadfast: {
    is_active: true, is_default: false,
    steadfast_base_url: "https://portal.packzy.com/api/v1",
    steadfast_api_key: "", steadfast_secret_key: "",
  },
} as const;

export default function CourierSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: tenantId } = useQuery({
    queryKey: ["my_tenant", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("tenant_id").eq("user_id", user!.id).maybeSingle();
      return data?.tenant_id ?? null;
    },
  });

  const { data: creds } = useQuery({
    queryKey: ["courier_credentials", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("courier_credentials").select("*").eq("tenant_id", tenantId);
      return (data || []) as any[];
    },
  });

  const [pathao, setPathao] = useState<any>(empty.pathao);
  const [steadfast, setSteadfast] = useState<any>(empty.steadfast);

  useEffect(() => {
    const p = creds?.find((c) => c.provider === "pathao");
    const s = creds?.find((c) => c.provider === "steadfast");
    if (p) setPathao({ ...empty.pathao, ...p });
    if (s) setSteadfast({ ...empty.steadfast, ...s });
  }, [creds]);

  const save = useMutation({
    mutationFn: async ({ provider, payload }: { provider: Provider; payload: any }) => {
      if (!tenantId) throw new Error("No tenant");
      const existing = creds?.find((c) => c.provider === provider);
      const data = { ...payload, tenant_id: tenantId, provider };
      delete (data as any).id; delete (data as any).created_at; delete (data as any).updated_at;
      delete (data as any).pathao_access_token; delete (data as any).pathao_refresh_token;
      delete (data as any).pathao_token_expires_at;
      if (existing) {
        const { error } = await (supabase as any).from("courier_credentials").update(data).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("courier_credentials").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courier_credentials"] });
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const webhook = (n: string) => `https://${projectId}.functions.supabase.co/${n}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Courier Integrations" description="Configure Pathao and Steadfast for automatic shipment dispatch" />

      <Card>
        <CardHeader>
          <CardTitle>Steadfast</CardTitle>
          <CardDescription>Get your API & Secret keys from Steadfast merchant panel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-6">
            <label className="flex items-center gap-2"><Switch checked={!!steadfast.is_active} onCheckedChange={(v) => setSteadfast({ ...steadfast, is_active: v })} /> Active</label>
            <label className="flex items-center gap-2"><Switch checked={!!steadfast.is_default} onCheckedChange={(v) => setSteadfast({ ...steadfast, is_default: v })} /> Default courier</label>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Base URL</Label><Input value={steadfast.steadfast_base_url || ""} onChange={(e) => setSteadfast({ ...steadfast, steadfast_base_url: e.target.value })} /></div>
            <div><Label>API Key</Label><Input value={steadfast.steadfast_api_key || ""} onChange={(e) => setSteadfast({ ...steadfast, steadfast_api_key: e.target.value })} /></div>
            <div><Label>Secret Key</Label><Input type="password" value={steadfast.steadfast_secret_key || ""} onChange={(e) => setSteadfast({ ...steadfast, steadfast_secret_key: e.target.value })} /></div>
          </div>
          <div className="text-xs text-muted-foreground break-all">Webhook URL: <code>{webhook("steadfast-webhook")}</code></div>
          <Button onClick={() => save.mutate({ provider: "steadfast", payload: steadfast })} disabled={save.isPending}>Save Steadfast</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pathao</CardTitle>
          <CardDescription>Use credentials from Pathao Merchant API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-6">
            <label className="flex items-center gap-2"><Switch checked={!!pathao.is_active} onCheckedChange={(v) => setPathao({ ...pathao, is_active: v })} /> Active</label>
            <label className="flex items-center gap-2"><Switch checked={!!pathao.is_default} onCheckedChange={(v) => setPathao({ ...pathao, is_default: v })} /> Default courier</label>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Base URL</Label><Input value={pathao.pathao_base_url || ""} onChange={(e) => setPathao({ ...pathao, pathao_base_url: e.target.value })} /></div>
            <div><Label>Store ID</Label><Input value={pathao.pathao_store_id || ""} onChange={(e) => setPathao({ ...pathao, pathao_store_id: e.target.value })} /></div>
            <div><Label>Client ID</Label><Input value={pathao.pathao_client_id || ""} onChange={(e) => setPathao({ ...pathao, pathao_client_id: e.target.value })} /></div>
            <div><Label>Client Secret</Label><Input type="password" value={pathao.pathao_client_secret || ""} onChange={(e) => setPathao({ ...pathao, pathao_client_secret: e.target.value })} /></div>
            <div><Label>Username</Label><Input value={pathao.pathao_username || ""} onChange={(e) => setPathao({ ...pathao, pathao_username: e.target.value })} /></div>
            <div><Label>Password</Label><Input type="password" value={pathao.pathao_password || ""} onChange={(e) => setPathao({ ...pathao, pathao_password: e.target.value })} /></div>
          </div>
          <div className="text-xs text-muted-foreground break-all">Webhook URL: <code>{webhook("pathao-webhook")}</code></div>
          <Button onClick={() => save.mutate({ provider: "pathao", payload: pathao })} disabled={save.isPending}>Save Pathao</Button>
        </CardContent>
      </Card>
    </div>
  );
}