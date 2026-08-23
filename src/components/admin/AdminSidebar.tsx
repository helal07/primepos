import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ShieldCheck, Building2, Package, Globe, CreditCard, Settings, LogOut, Wallet2,
  LayoutDashboard, MessageSquare, Send, Wallet, ChevronDown,
  FileText, UserCircle2, Mail, Bell, FileEdit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/hooks/useBranding";

const overviewItems = [
  { to: "/superadmin", label: "Dashboard", icon: LayoutDashboard, end: true },
];

const platformItems = [
  { to: "/superadmin/tenants", label: "Tenants", icon: Building2 },
  { to: "/superadmin/packages", label: "Packages", icon: Package },
  { to: "/superadmin/payments", label: "Payments", icon: Wallet2 },
];

const cmsItems = [
  { to: "/superadmin/cms", label: "Sections", icon: Globe, end: true },
];

const smsItems = [
  { to: "/superadmin/sms/providers", label: "SMS Providers", icon: MessageSquare },
  { to: "/superadmin/sms/plans", label: "SMS Plans", icon: Send },
  { to: "/superadmin/sms/purchases", label: "SMS Purchases", icon: Wallet },
];

const notificationItems = [
  { to: "/superadmin/notifications", label: "Send Notification", icon: Bell },
  { to: "/superadmin/notification-templates", label: "Notification Templates", icon: FileEdit },
];

const systemItems = [
  { to: "/superadmin/profile", label: "My Profile", icon: UserCircle2 },
  { to: "/superadmin/trial-emails", label: "Trial Emails", icon: Mail },
  { to: "/superadmin/settings", label: "Settings", icon: Settings },
];

interface Props {
  onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: Props) {
  const { signOut } = useAuth();
  const location = useLocation();
  const { brandName, brandShort, logoUrl } = useBranding();
  const [logoError, setLogoError] = useState(false);
  const smsActive = location.pathname.startsWith("/superadmin/sms");
  const [smsOpen, setSmsOpen] = useState(smsActive);
  const cmsActive = location.pathname.startsWith("/superadmin/cms");
  const [cmsOpen, setCmsOpen] = useState(cmsActive);
  const notifActive =
    location.pathname.startsWith("/superadmin/notifications") ||
    location.pathname.startsWith("/superadmin/notification-templates");
  const [notifOpen, setNotifOpen] = useState(notifActive);

  const linkClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
    );

  const renderGroup = (label: string, list: typeof platformItems) => (
    <div className="pt-1">
      <div className="px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
        {label}
      </div>
      {list.map((it: any) => (
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
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-md">
          {logoUrl && !logoError ? (
            <img
              src={logoUrl}
              alt={brandName}
              className="h-full w-full object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="text-sm font-bold">{brandShort}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">Super Admin</div>
          <div className="truncate text-[11px] text-sidebar-foreground/60">{brandName}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 pt-2">
        {renderGroup("Overview", overviewItems)}
        {renderGroup("Platform", platformItems)}

        <div className="pt-2">
          <div className="px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Website
          </div>
          <button
            type="button"
            onClick={() => setCmsOpen((v) => !v)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              cmsActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <Globe className="h-[18px] w-[18px]" />
            <span className="flex-1 text-left">Landing CMS</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", cmsOpen && "rotate-180")} />
          </button>
          {cmsOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border/60 pl-3">
              {cmsItems.map((s) => (
                <NavLink
                  key={s.to}
                  to={s.to}
                  end={s.end}
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

        <div className="pt-2">
          <div className="px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Messaging
          </div>
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

        {renderGroup("System", systemItems)}

        <div className="pt-2">
          <div className="px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Notifications
          </div>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              notifActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="flex-1 text-left">Notifications</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", notifOpen && "rotate-180")} />
          </button>
          {notifOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l border-sidebar-border/60 pl-3">
              {notificationItems.map((s) => (
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
