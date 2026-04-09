import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Users, Package, CreditCard, Globe, Ban, TrendingUp, DollarSign, Ticket } from "lucide-react";
import { useTenants, usePackages } from "@/hooks/useSaasAdmin";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { data: tenants } = useTenants();
  const { data: packages } = usePackages();
  const navigate = useNavigate();

  const activeTenants = tenants?.filter((t) => t.status === "active").length ?? 0;
  const trialTenants = tenants?.filter((t) => t.status === "trial").length ?? 0;
  const expiredTenants = tenants?.filter((t) => t.status === "expired").length ?? 0;
  const suspendedTenants = tenants?.filter((t) => t.status === "suspended").length ?? 0;
  const totalTenants = tenants?.length ?? 0;

  // Estimate monthly revenue from active tenants with packages
  const monthlyRevenue = tenants?.reduce((sum, t: any) => {
    if (t.status === "active" && t.saas_packages?.price) return sum + Number(t.saas_packages.price);
    return sum;
  }, 0) ?? 0;

  const cards = [
    { title: "Total Tenants", value: totalTenants, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", path: "/admin/tenants" },
    { title: "Active", value: activeTenants, icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10", path: "/admin/tenants" },
    { title: "Trial", value: trialTenants, icon: Users, color: "text-yellow-500", bg: "bg-yellow-500/10", path: "/admin/tenants" },
    { title: "Expired", value: expiredTenants, icon: Users, color: "text-red-500", bg: "bg-red-500/10", path: "/admin/tenants" },
    { title: "Suspended", value: suspendedTenants, icon: Ban, color: "text-orange-500", bg: "bg-orange-500/10", path: "/admin/tenants" },
    { title: "Packages", value: packages?.length ?? 0, icon: Package, color: "text-purple-500", bg: "bg-purple-500/10", path: "/admin/packages" },
    { title: "Revenue/mo", value: `৳${monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10", path: "/admin/transactions" },
    { title: "CMS", value: "Manage", icon: Globe, color: "text-cyan-500", bg: "bg-cyan-500/10", path: "/admin/cms" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="SaaS Admin Dashboard" subtitle="Platform overview & management" />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card
            key={c.title}
            className="cursor-pointer hover:shadow-lg transition-all border-border/50 hover:border-primary/30"
            onClick={() => navigate(c.path)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${c.bg}`}>
                <c.icon className={`h-6 w-6 ${c.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.title}</p>
              </div>
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
              {tenants.slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.email ?? t.phone ?? "—"} {t.company_name ? `· ${t.company_name}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t.saas_packages?.name ?? "No package"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.status === "active" ? "bg-green-100 text-green-700" :
                      t.status === "trial" ? "bg-yellow-100 text-yellow-700" :
                      t.status === "suspended" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
