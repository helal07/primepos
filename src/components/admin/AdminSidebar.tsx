import { useLocation, useNavigate } from "react-router-dom";
import {
  Crown, Building2, Package, Globe, CreditCard, Settings, LogOut, LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const adminMenu = [
  { title: "Dashboard", url: "/admin", icon: Crown },
  { title: "Tenants", url: "/admin/tenants", icon: Building2 },
  { title: "Packages", url: "/admin/packages", icon: Package },
  { title: "CMS", url: "/admin/cms", icon: Globe },
  { title: "Transactions", url: "/admin/transactions", icon: CreditCard },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-sm">
          P
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight">Prime POS</span>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Super Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {adminMenu.map((item) => {
          const isActive = location.pathname === item.url ||
            (item.url !== "/admin" && location.pathname.startsWith(item.url));
          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              <span>{item.title}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-700/50 space-y-1">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Tenant Dashboard</span>
        </button>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
