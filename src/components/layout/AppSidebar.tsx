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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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


const menuGroups: { label: string; module?: ModuleKey; items: any[] }[] = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Products",
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
      { title: "Warranties", url: "/warranties", icon: BadgeCheck },
      { title: "Bulk Import", url: "/products/import", icon: FileUp },
      { title: "Export", url: "/products/export", icon: FileDown },
      { title: "Print Labels", url: "/products/labels", icon: Printer },
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
    label: "Installment",
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
    label: "People",
    module: "contacts",
    items: [
      { title: "Customers", url: "/customers", icon: UserCircle },
      { title: "Customer Groups", url: "/contacts/customer-groups", icon: Users },
      { title: "Suppliers", url: "/suppliers", icon: Building2 },
    ],
  },
  {
    label: "Finance",
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
    label: "Warranty",
    module: "warranty",
    items: [
      { title: "Warranty Claims", url: "/warranty-claims", icon: Wrench },
    ],
  },
  {
    label: "CMS",
    module: "cms",
    items: [
      { title: "Pages", url: "/cms/pages", icon: Globe },
    ],
  },
  {
    label: "Exchange",
    module: "exchange",
    items: [
      { title: "Dashboard", url: "/exchange", icon: ArrowLeftRight },
      { title: "Buys", url: "/exchange/purchases", icon: ListOrdered },
      { title: "New Buy", url: "/exchange/purchases/add", icon: Plus },
      { title: "Sell", url: "/exchange/sell", icon: ShoppingBag },
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
    label: "Admin",
    items: [
      { title: "Users", url: "/users", icon: UserCog },
      { title: "Roles & Permissions", url: "/roles", icon: Shield },
      { title: "Activity Log", url: "/activity-log", icon: Activity },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user } = useAuth();
  const [isSuperadmin, setIsSuperadmin] = useState(false);

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
    if (!user) return;
    supabase.rpc("is_superadmin", { _user_id: user.id }).then(({ data }) => {
      setIsSuperadmin(!!data);
    });
  }, [user]);

  const { data: enabledModules } = useEnabledModules();
  const allGroups = menuGroups.filter((g) => !g.module || (enabledModules ?? []).includes(g.module));

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            P
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-accent-foreground">
              Prime POS
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {allGroups.map((group) => {
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
                      <SidebarMenuButton asChild size="sm">
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
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
                  className="text-sidebar-foreground/50 text-xs uppercase tracking-wider cursor-pointer hover:text-sidebar-foreground/80 transition-colors"
                >
                  <CollapsibleTrigger className="flex w-full items-center justify-between">
                    <span>{group.label}</span>
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
                          <SidebarMenuButton asChild size="sm">
                            <NavLink
                              to={item.url}
                              end={item.url === "/"}
                              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              {!collapsed && <span>{item.title}</span>}
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
            activeClassName=""
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
