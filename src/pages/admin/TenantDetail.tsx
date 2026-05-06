import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TenantDetail() {
  const { id } = useParams();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant_detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, saas_packages(name, price, enabled_modules)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["tenant_sms_purchases", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("sms_purchases").select("*, sms_plans(name)").eq("tenant_id", id!).order("purchased_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!tenant) return <p className="text-sm text-muted-foreground">Tenant not found.</p>;

  const modules: string[] = tenant.enabled_modules ?? tenant.saas_packages?.enabled_modules ?? [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild><Link to="/superadmin/tenants"><ArrowLeft className="h-4 w-4 mr-1" />Back to tenants</Link></Button>
      <PageHeader title={tenant.name ?? "Tenant"} description={tenant.email ?? ""} />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Overview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge>{tenant.status ?? "active"}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{tenant.phone ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{new Date(tenant.created_at).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Package</span><span>{tenant.saas_packages?.name ?? "—"}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Enabled Modules</CardTitle></CardHeader>
          <CardContent>
            {modules.length ? (
              <div className="flex flex-wrap gap-1.5">{modules.map((m) => <Badge key={m} variant="secondary">{m}</Badge>)}</div>
            ) : <p className="text-sm text-muted-foreground">No modules configured.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent SMS Purchases</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {purchases.length ? purchases.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
              <div>
                <p className="font-medium">{p.sms_plans?.name ?? "Custom"}</p>
                <p className="text-xs text-muted-foreground">{new Date(p.purchased_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">৳{Number(p.amount).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{p.sms_count} SMS</p>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No purchases.</p>}
        </CardContent>
      </Card>
    </div>
  );
}