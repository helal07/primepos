import { useLocation, useNavigate } from "react-router-dom";
import { X, Crown, Building2, Package, Globe, CreditCard, Settings, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const adminMenu = [
  { title: "Dashboard", url: "/superadmin", icon: Crown },
  { title: "Tenants", url: "/superadmin/tenants", icon: Building2 },
  { title: "Packages", url: "/superadmin/packages", icon: Package },
  { title: "CMS", url: "/superadmin/cms", icon: Globe },
  { title: "CMS Pages", url: "/superadmin/cms/pages", icon: Globe },
  { title: "Transactions", url: "/superadmin/transactions", icon: CreditCard },
  { title: "Settings", url: "/superadmin/settings", icon: Settings },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdminMobileNav({ open, onClose }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  if (!open) return null;

  const go = (url: string) => { navigate(url); onClose(); };

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar text-sidebar-foreground flex flex-col animate-in slide-in-from-left">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sidebar-foreground font-bold text-sm">P</div>
            <div>
              <span className="font-bold">Prime POS</span>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Super Admin</p>
            </div>
          </div>
          <button onClick={onClose} className="text-sidebar-foreground/60 hover:text-sidebar-accent-foreground"><X className="h-5 w-5" /></button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {adminMenu.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <button
                key={item.url}
                onClick={() => go(item.url)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.title}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-border/50 space-y-1">
          <button onClick={() => go("/dashboard")} className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LayoutDashboard className="h-4 w-4" /><span>Tenant Dashboard</span>
          </button>
          <button onClick={() => signOut()} className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-red-500/20 hover:text-red-400">
            <LogOut className="h-4 w-4" /><span>Logout</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
