import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldCheck, Building2, Package, Globe, CreditCard, Settings, LogOut,
  LayoutDashboard, MessageSquare, Send, Wallet, FileCode, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/tenants", label: "Tenants", icon: Building2 },
  { to: "/admin/packages", label: "Packages", icon: Package },
  { to: "/admin/cms", label: "Landing CMS", icon: Globe },
  { to: "/admin/sitemap", label: "Sitemap", icon: FileCode },
  { to: "/admin/transactions", label: "Transactions", icon: CreditCard },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const smsItems = [
  { to: "/admin/sms/providers", label: "SMS Providers", icon: MessageSquare },
  { to: "/admin/sms/plans", label: "SMS Plans", icon: Send },
  { to: "/admin/sms/purchases", label: "SMS Purchases", icon: Wallet },
];

interface Props {
  onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: Props) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const smsActive = location.pathname.startsWith("/admin/sms");
  const [smsOpen, setSmsOpen] = useState(smsActive);

  const linkClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
    );

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">Super Admin</div>
          <div className="truncate text-[11px] text-sidebar-foreground/60">Control Panel</div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
        My Account
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            onClick={onNavigate}
            className={({ isActive }) => linkClass(isActive)}
          >
            <it.icon className="h-[18px] w-[18px]" />
            {it.label}
          </NavLink>
        ))}

        {/* SMS group */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setSmsOpen((v) => !v)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              smsActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <MessageSquare className="h-[18px] w-[18px]" />
            <span className="flex-1 text-left">SMS Settings</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", smsOpen && "rotate-180")} />
          </button>
          {smsOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border/60 pl-3">
              {smsItems.map((s) => (
                <NavLink
                  key={s.to}
                  to={s.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent/80 text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
                    )
                  }
                >
                  <s.icon className="h-[15px] w-[15px]" />
                  {s.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button
          onClick={() => { navigate("/dashboard"); onNavigate?.(); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LayoutDashboard className="h-[18px] w-[18px]" />
          Tenant Dashboard
        </button>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Log Out
        </button>
      </div>
    </div>
  );
}
