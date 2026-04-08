import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Landmark,
  Shield,
  Settings,
  Tags,
  Layers,
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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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

const menuGroups = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Products",
    items: [
      { title: "Products", url: "/products", icon: Package },
      { title: "Categories", url: "/categories", icon: Tags },
      { title: "Brands", url: "/brands", icon: Award },
      { title: "Units", url: "/units", icon: Ruler },
      { title: "Variations", url: "/variations", icon: Shuffle },
      { title: "Warranties", url: "/warranties", icon: BadgeCheck },
      { title: "Bulk Import", url: "/products/import", icon: FileUp },
      { title: "Export", url: "/products/export", icon: FileDown },
      { title: "Print Labels", url: "/products/labels", icon: Printer },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "POS", url: "/pos", icon: MonitorSmartphone },
      { title: "Sales List", url: "/sales", icon: ListOrdered },
      { title: "Invoices", url: "/invoices", icon: FileText },
      { title: "Drafts", url: "/sales/drafts", icon: FilePenLine },
      { title: "Quotations", url: "/quotations", icon: FileQuestion },
      { title: "Sale Returns", url: "/sales/returns", icon: Undo2 },
      { title: "Shipments", url: "/shipments", icon: Ship },
    ],
  },
  {
    label: "Purchase",
    items: [
      { title: "Add Purchase", url: "/purchases/add", icon: PackagePlus },
      { title: "Purchase List", url: "/purchases", icon: ClipboardList },
      { title: "Purchase Orders", url: "/purchase-orders", icon: Truck },
      { title: "Purchase Returns", url: "/purchases/returns", icon: RotateCcw },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Customers", url: "/customers", icon: UserCircle },
      { title: "Suppliers", url: "/suppliers", icon: Building2 },
    ],
  },
  {
    label: "Finance",
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
    items: [
      { title: "Employees", url: "/employees", icon: Users },
      { title: "Attendance", url: "/attendance", icon: CalendarDays },
      { title: "Leave", url: "/leave", icon: Clock },
      { title: "Payroll", url: "/payroll", icon: Banknote },
    ],
  },
  {
    label: "Warranty",
    items: [
      { title: "Warranty Claims", url: "/warranty-claims", icon: Wrench },
    ],
  },
  {
    label: "CMS",
    items: [
      { title: "Pages", url: "/cms/pages", icon: Globe },
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

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            E
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-accent-foreground">
              ERP Suite
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {menuGroups.map((group) => {
          const isGroupActive = group.items.some(
            (item) => location.pathname === item.url || location.pathname.startsWith(item.url + "/")
          );
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
                {group.label}
              </SidebarGroupLabel>
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
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="p-4">
        {!collapsed && (
          <p className="text-xs text-sidebar-foreground/40">© 2026 ERP Suite</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
