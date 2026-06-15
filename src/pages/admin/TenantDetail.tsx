import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";
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
      const t = await rest.get<any>("tenants", id!, { with: ["package"] });
      // Alias singular relation to legacy plural key the UI expects.
      return { ...t, saas_packages: t?.package ?? null };
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["tenant_sms_purchases", id],
    enabled: !!id,
    queryFn: async () => {
      const rows = await rest.all<any>("sms_purchases", {
        filter: { tenant_id: id! }, with: ["plan"], sort: "-purchased_at", perPage: 10,
      });
      return rows.map((r: any) => ({ ...r, sms_plans: r.plan ?? null }));
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