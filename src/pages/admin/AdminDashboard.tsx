import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Users, Package, CreditCard, Settings, BarChart3, Globe } from "lucide-react";
import { useTenants, usePackages } from "@/hooks/useSaasAdmin";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { data: tenants } = useTenants();
  const { data: packages } = usePackages();
  const navigate = useNavigate();

  const activeTenants = tenants?.filter((t) => t.status === "active").length ?? 0;
  const trialTenants = tenants?.filter((t) => t.status === "trial").length ?? 0;
  const expiredTenants = tenants?.filter((t) => t.status === "expired").length ?? 0;
  const totalTenants = tenants?.length ?? 0;

  const cards = [
    { title: "Total Tenants", value: totalTenants, icon: Users, color: "text-blue-500", path: "/admin/tenants" },
    { title: "Active", value: activeTenants, icon: Users, color: "text-green-500", path: "/admin/tenants" },
    { title: "Trial", value: trialTenants, icon: Users, color: "text-yellow-500", path: "/admin/tenants" },
    { title: "Expired", value: expiredTenants, icon: Users, color: "text-red-500", path: "/admin/tenants" },
    { title: "Packages", value: packages?.length ?? 0, icon: Package, color: "text-purple-500", path: "/admin/packages" },
    { title: "CMS", value: "Manage", icon: Globe, color: "text-cyan-500", path: "/admin/cms" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="SaaS Admin Dashboard" subtitle="Manage tenants, packages, and platform settings" />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <Card
            key={c.title}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(c.path)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <c.icon className={`h-8 w-8 ${c.color}`} />
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent tenants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {!tenants?.length ? (
            <p className="text-muted-foreground text-sm">No tenants yet.</p>
          ) : (
            <div className="space-y-2">
              {tenants.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.email ?? t.phone ?? "—"}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    t.status === "active" ? "bg-green-100 text-green-700" :
                    t.status === "trial" ? "bg-yellow-100 text-yellow-700" :
                    t.status === "suspended" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
