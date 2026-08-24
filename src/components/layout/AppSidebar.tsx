import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  Shield,
  Settings,
  Tags,
  Award,
  Ruler,
  Shuffle,
  FileUp,
  FileDown,
  Printer,
  BadgeCheck,
  MonitorSmartphone,
  ListOrdered,
  FileText,
  FilePenLine,
  FileQuestion,
  Undo2,
  Ship,
  ClipboardList,
  PackagePlus,
  RotateCcw,
  UserCircle,
  Building2,
  BookOpen,
  ArrowLeftRight,
  PenLine,
  Scale,
  TrendingUp,
  List,
  UserCog,
  Activity,
  Wrench,
  CalendarDays,
  Clock,
  Banknote,
  Globe,
  ChevronRight,
  BarChart3,
  CreditCard,
  UserPlus,
  CalendarCheck,
  Crown,
  CalendarRange,
  AlertCircle,
  ShoppingBag,
  Receipt,
  Contact,
  Layers,
  Flame,
  Wallet,
  Calculator,
  Plus,
  Lock,
  Warehouse as WarehouseIcon,
  DatabaseBackup,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import { normalizeStorageUrl } from "@/lib/storage";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import type { ModuleKey } from "@/lib/modules";
import { useMyPermissions } from "@/hooks/usePermission";

// Map sidebar URL → permission module key (must match MODULE_LIST in useRoles).
// URLs not present here are not gated by per-role permissions (only by tenant
// module entitlement). Tenant Manager and Superadmin always bypass.
const URL_PERM_MODULE: Record<string, string> = {
  "/dashboard": "dashboard",
  "/products": "products",
  "/products/add": "products",
  "/products/price-groups": "products",
  "/products/import": "products",
  "/products/export": "products",
  "/products/labels": "products",
  "/categories": "categories",
  "/brands": "brands",
  "/units": "units",
  "/variations": "products",
  "/stock-adjustments": "products",
  "/stock-transfers": "products",
  "/sales": "sales",
  "/sales/orders": "sales",
  "/sales/drafts": "sales",
  "/sales/returns": "sales",
  "/invoices": "sales",
  "/quotations": "sales",
  "/shipments": "sales",
  "/pos": "pos",
  "/purchases": "purchases",
  "/purchases/add": "purchases",
  "/purchase-orders": "purchases",
  "/purchases/returns": "purchases",
  "/customers": "customers",
  "/contacts/customer-groups": "customers",
  "/suppliers": "suppliers",
  "/accounts": "accounting",
  "/transactions": "accounting",
  "/journal": "accounting",
  "/trial-balance": "accounting",
  "/cash-flow": "accounting",
  "/account-list": "accounting",
  "/employees": "hrm",
  "/attendance": "hrm",
  "/leave": "hrm",
  "/payroll": "hrm",
  "/warranties": "warranty",
  "/warranty-claims": "warranty",
  "/users": "users",
  "/roles": "roles",
  "/settings": "settings",
};


const menuGroups: { label: string; module?: ModuleKey; items: any[] }[] = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Warehouses",
    module: "warehouses",
    items: [
      { title: "Warehouses", url: "/warehouses", icon: WarehouseIcon },
      { title: "Stock by Warehouse", url: "/warehouses/stock", icon: Package },
    ],
  },
  {
    label: "Contact",
    module: "contacts",
    items: [
      { title: "Customers", url: "/customers", icon: UserCircle },
      { title: "Customer Groups", url: "/contacts/customer-groups", icon: Users },
      { title: "Suppliers", url: "/suppliers", icon: Building2 },
    ],
  },
  {
    label: "Product",
    module: "products",
    items: [
      { title: "Products", url: "/products", icon: Package },
      { title: "Categories", url: "/categories", icon: Tags },
      { title: "Brands", url: "/brands", icon: Award },
      { title: "Price Groups", url: "/products/price-groups", icon: Layers },
      { title: "Units", url: "/units", icon: Ruler },
      { title: "Variations", url: "/variations", icon: Shuffle },
      { title: "Stock Adjustments", url: "/stock-adjustments", icon: ClipboardList },
      { title: "Stock Transfers", url: "/stock-transfers", icon: Truck },
      { title: "Bulk Import", url: "/products/import", icon: FileUp },
      { title: "Export", url: "/products/export", icon: FileDown },
      { title: "Print Labels", url: "/products/labels", icon: Printer },
    ],
  },
  {
    label: "Purchase",
    module: "purchases",
    items: [
      { title: "Add Purchase", url: "/purchases/add", icon: PackagePlus },
      { title: "Purchase List", url: "/purchases", icon: ClipboardList },
      { title: "Purchase Orders", url: "/purchase-orders", icon: Truck },
      { title: "Purchase Returns", url: "/purchases/returns", icon: RotateCcw },
    ],
  },
  {
    label: "Sales",
    module: "sales",
    items: [
      { title: "POS", url: "/pos", icon: MonitorSmartphone },
      { title: "Sales List", url: "/sales", icon: ListOrdered },
      { title: "Sales Orders", url: "/sales/orders", icon: ClipboardList },
      { title: "Invoices", url: "/invoices", icon: FileText },
      { title: "Drafts", url: "/sales/drafts", icon: FilePenLine },
      { title: "Quotations", url: "/quotations", icon: FileQuestion },
      { title: "Sale Returns", url: "/sales/returns", icon: Undo2 },
      { title: "Shipments", url: "/shipments", icon: Ship },
    ],
  },
  {
    label: "Expenses",
    module: "expenses",
    items: [
      { title: "List Expenses", url: "/expenses", icon: ListOrdered },
      { title: "Add Expense", url: "/expenses/add", icon: Plus },
      { title: "Expense Categories", url: "/expenses/categories", icon: Tags },
    ],
  },
  {
    label: "Accounts",
    module: "accounting",
    items: [
      { title: "Chart of Accounts", url: "/accounts", icon: BookOpen },
      { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
      { title: "Journal Entries", url: "/journal", icon: PenLine },
      { title: "Trial Balance", url: "/trial-balance", icon: Scale },
      { title: "Cash Flow", url: "/cash-flow", icon: TrendingUp },
      { title: "Account List", url: "/account-list", icon: List },
    ],
  },
  {
    label: "Reports",
    module: "reports",
    items: [
      { title: "Overview", url: "/reports", icon: BarChart3 },
      { title: "Profit / Loss", url: "/reports/profit-loss", icon: TrendingUp },
      { title: "Daily Summary", url: "/reports/daily-summary", icon: CalendarRange },
      { title: "Due Sale Report", url: "/reports/due-sales", icon: AlertCircle },
      { title: "Product Profit", url: "/reports/product-profit", icon: ShoppingBag },
      { title: "Purchase & Sale", url: "/reports/purchase-sale", icon: Receipt },
      { title: "Tax Report", url: "/reports/tax", icon: Scale },
      { title: "Contacts Report", url: "/reports/contacts", icon: Contact },
      { title: "Stock Report", url: "/reports/stock", icon: Package },
      { title: "Items Report", url: "/reports/items", icon: Layers },
      { title: "Trending Products", url: "/reports/trending", icon: Flame },
      { title: "Installment Report", url: "/reports/installment", icon: Wallet },
      { title: "Expense Report", url: "/reports/expense", icon: Banknote },
      { title: "Register Report", url: "/reports/register", icon: Calculator },
    ],
  },
  {
    label: "Warranty Manager",
    module: "warranty",
    items: [
      { title: "Warranties", url: "/warranties", icon: BadgeCheck },
      { title: "Warranty Claims", url: "/warranty-claims", icon: Wrench },
    ],
  },
  {
    label: "Installment Sale",
    module: "installments",
    items: [
      { title: "Add Customer", url: "/installment/customers/add", icon: UserPlus },
      { title: "Customers", url: "/installment/customers", icon: UserCircle },
      { title: "New Sale", url: "/installment/sales/add", icon: CreditCard },
      { title: "Sales List", url: "/installment/sales", icon: ListOrdered },
      { title: "Collection", url: "/installment/collections", icon: Banknote },
      { title: "Schedule", url: "/installment/schedule", icon: CalendarCheck },
    ],
  },
  {
    label: "HRM",
    module: "hrm",
    items: [
      { title: "Employees", url: "/employees", icon: Users },
      { title: "Attendance", url: "/attendance", icon: CalendarDays },
      { title: "Leave", url: "/leave", icon: Clock },
      { title: "Payroll", url: "/payroll", icon: Banknote },
    ],
  },
  {
    label: "Buy & Sale",
    module: "exchange",
    items: [
      { title: "Dashboard", url: "/exchange", icon: ArrowLeftRight },
      { title: "Buys", url: "/exchange/purchases", icon: ListOrdered },
      { title: "New Buy", url: "/exchange/purchases/add", icon: Plus },
      { title: "Sell", url: "/exchange/sell", icon: ShoppingBag },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Users", url: "/users", icon: UserCog },
      { title: "Roles & Permissions", url: "/roles", icon: Shield },
      { title: "Activity Log", url: "/activity-log", icon: Activity },
      { title: "Settings", url: "/settings", icon: Settings },
      { title: "Backup & Restore", url: "/settings/backup", icon: DatabaseBackup },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user } = useAuth();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  const business = settings?.business ?? {};
  const tenantName = user?.tenant?.name || "Prime POS";
  const companyName = business.company_name || tenantName;
  const logoUrl = normalizeStorageUrl(business.logo_url || "");
  const nameInitial = companyName.charAt(0).toUpperCase();

  // Find which group is active based on current route
  const activeGroupLabel = menuGroups.find((group) =>
    group.items.some(
      (item) =>
        location.pathname === item.url ||
        location.pathname.startsWith(item.url + "/")
    )
  )?.label ?? null;

  const [openGroup, setOpenGroup] = useState<string | null>(activeGroupLabel);

  // Update open group when route changes
  useEffect(() => {
    if (activeGroupLabel) {
      setOpenGroup(activeGroupLabel);
    }
  }, [activeGroupLabel]);

  useEffect(() => {
    setIsSuperadmin(!!user?.is_superadmin);
  }, [user]);

  const { data: enabledModules } = useEnabledModules();
  const { data: permData } = useMyPermissions();
  const isAdmin = permData?.isAdmin ?? false;

  // Audit: record the effective permissions used to render the sidebar.
  // Dedupe per session+route so we don't spam inserts on every re-render.
  useEffect(() => {
    if (!user || !permData) return;
    const route = location.pathname;
    const key = `spa_audit:${user.id}:${route}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    // Sidebar permission audit was a Supabase-only debug write; backend endpoint
    // not yet implemented, so the insert is skipped on the Sanctum stack.
  }, [user, permData, location.pathname]);

  const canSeeUrl = (url: string) => {
    if (isAdmin || isSuperadmin) return true;
    // Permissions not loaded yet (or the request failed): don't blank the menu.
    if (!permData) return true;
    const mod = URL_PERM_MODULE[url];
    if (!mod) return true;
    return !!permData.perms?.[mod]?.can_view;

  };
  // Show every group; locked groups route to the upgrade page.
  const allGroups = menuGroups
    .map((g) => ({ ...g, items: g.items.filter((it: any) => canSeeUrl(it.url)) }))
    .filter((g) => g.items.length > 0);
  const isLocked = (g: typeof menuGroups[number]) =>
    !!g.module && !!enabledModules && !enabledModules.includes(g.module);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="h-full w-full object-contain" />
            ) : (
              nameInitial
            )}
          </div>
          {!collapsed && (
            <span className="min-w-0 flex-1 text-lg font-bold text-sidebar-accent-foreground truncate">
              {settingsLoading ? "..." : companyName}
            </span>
          )}
        </div>
      </SidebarHeader>


      <SidebarContent className="px-2">
        {allGroups.map((group) => {
          const locked = isLocked(group);
          const lockedHref = group.module ? `/locked/${group.module}` : "#";
          const isGroupActive = group.items.some(
            (item) =>
              location.pathname === item.url ||
              location.pathname.startsWith(item.url + "/")
          );

          // Single-item groups don't need folding
          if (group.items.length === 1) {
            return (
              <SidebarGroup key={group.label}>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        size="lg"
                        className="h-12 gap-3 rounded-xl px-3 text-base group-data-[collapsible=icon]:!h-10"
                        tooltip={locked ? "Upgrade your plan to access" : item.title}
                      >
                        <NavLink
                          to={locked ? lockedHref : item.url}
                          end={item.url === "/"}
                          className={({ isActive }) =>
                            [
                              "relative transition-colors",
                              isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-sidebar-primary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                : "font-semibold text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                              locked ? "opacity-60" : "",
                            ].join(" ")
                          }
                        >
                          <item.icon className="h-[22px] w-[22px] shrink-0" />
                          {!collapsed && <span className="flex-1">{item.title}</span>}
                          {!collapsed && locked && <Lock className="h-3.5 w-3.5 ml-auto opacity-70" />}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                  ))}
                </SidebarMenu>

              </SidebarGroup>
            );
          }

          return (
            <Collapsible
              key={group.label}
              open={openGroup === group.label}
              onOpenChange={(isOpen) => setOpenGroup(isOpen ? group.label : null)}
              className="group/collapsible"
            >
              <SidebarGroup>
                <SidebarGroupLabel
                  asChild
                  className={`text-sidebar-foreground/60 text-[11px] font-semibold uppercase tracking-wider cursor-pointer hover:text-sidebar-foreground transition-colors ${locked ? "opacity-60" : ""}`}
                >
                  <CollapsibleTrigger className="flex w-full items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      {group.label}
                      {locked && <Lock className="h-3 w-3" />}
                    </span>
                    {!collapsed && (
                      <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    )}
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            size="lg"
                            className="h-11 gap-3 rounded-xl px-3 text-[15px] group-data-[collapsible=icon]:!h-10"
                            tooltip={locked ? "Upgrade your plan to access" : item.title}
                          >
                            <NavLink
                              to={locked ? lockedHref : item.url}
                              end={item.url === "/"}
                              className={({ isActive }) =>
                                [
                                  "transition-colors font-medium",
                                  isActive
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                  locked ? "opacity-60" : "",
                                ].join(" ")
                              }
                            >
                              <item.icon className="h-5 w-5 shrink-0" />
                              {!collapsed && <span className="flex-1">{item.title}</span>}
                              {!collapsed && locked && <Lock className="h-3.5 w-3.5 ml-auto opacity-70" />}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-2">
        {!collapsed && isSuperadmin && (
          <NavLink
            to="/superadmin"
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors font-medium"
          >
            <Crown className="h-3.5 w-3.5" />
            SaaS Admin Panel
          </NavLink>
        )}
        {!collapsed && (
          <p className="text-xs text-sidebar-foreground/40">© 2026 Prime POS</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
