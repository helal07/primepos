import { Users, Package, Ban, TrendingUp, DollarSign, Globe, ShieldCheck, Clock } from "lucide-react";
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
  const pendingTenants = tenants?.filter((t) => t.status === "pending_approval").length ?? 0;
  const totalTenants = tenants?.length ?? 0;

  const monthlyRevenue = tenants?.reduce((sum, t: any) => {
    if (t.status === "active" && t.saas_packages?.price) return sum + Number(t.saas_packages.price);
    return sum;
  }, 0) ?? 0;

  const cards = [
    { title: "Total Tenants", value: totalTenants, icon: Users, gradient: "from-blue-600 to-blue-800", path: "/admin/tenants" },
    { title: "Active", value: activeTenants, icon: TrendingUp, gradient: "from-emerald-600 to-emerald-800", path: "/admin/tenants" },
    { title: "Trial", value: trialTenants, icon: Clock, gradient: "from-amber-600 to-amber-800", path: "/admin/tenants" },
    { title: "Pending", value: pendingTenants, icon: ShieldCheck, gradient: "from-cyan-600 to-cyan-800", path: "/admin/tenants" },
    { title: "Expired", value: expiredTenants, icon: Ban, gradient: "from-red-600 to-red-800", path: "/admin/tenants" },
    { title: "Suspended", value: suspendedTenants, icon: Ban, gradient: "from-orange-600 to-orange-800", path: "/admin/tenants" },
    { title: "Packages", value: packages?.length ?? 0, icon: Package, gradient: "from-purple-600 to-purple-800", path: "/admin/packages" },
    { title: "Revenue/mo", value: `৳${monthlyRevenue.toLocaleString()}`, icon: DollarSign, gradient: "from-teal-600 to-teal-800", path: "/admin/transactions" },
    { title: "CMS", value: "Manage", icon: Globe, gradient: "from-indigo-600 to-indigo-800", path: "/admin/cms" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Platform overview & management</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div
            key={c.title}
            onClick={() => navigate(c.path)}
            className={`cursor-pointer rounded-xl bg-gradient-to-br ${c.gradient} p-4 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between">
              <c.icon className="h-8 w-8 text-white/70" />
            </div>
            <p className="text-2xl font-bold text-white mt-3">{c.value}</p>
            <p className="text-xs text-white/70 mt-1">{c.title}</p>
          </div>
        ))}
      </div>

      {/* Recent tenants */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-base font-semibold text-white">Recent Tenants</h3>
        </div>
        <div className="p-4">
          {!tenants?.length ? (
            <p className="text-slate-400 text-sm">No tenants yet.</p>
          ) : (
            <div className="space-y-2">
              {tenants.slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-white">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.email ?? t.phone ?? "—"} {t.company_name ? `· ${t.company_name}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{t.saas_packages?.name ?? "No package"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                      t.status === "trial" ? "bg-amber-500/20 text-amber-400" :
                      t.status === "pending_approval" ? "bg-blue-500/20 text-blue-400" :
                      t.status === "suspended" ? "bg-red-500/20 text-red-400" :
                      "bg-slate-700 text-slate-400"
                    }`}>{t.status === "pending_approval" ? "Pending" : t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
