import { LayoutDashboard, MonitorSmartphone, Package, ListOrdered, Menu, X } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "POS", url: "/pos", icon: MonitorSmartphone },
  { title: "Products", url: "/products", icon: Package },
  { title: "Sales", url: "/sales", icon: ListOrdered },
];

const moreItems = [
  { title: "Categories", url: "/categories" },
  { title: "Customers", url: "/customers" },
  { title: "Suppliers", url: "/suppliers" },
  { title: "Purchases", url: "/purchases" },
  { title: "Invoices", url: "/invoices" },
  { title: "Accounts", url: "/accounts" },
  { title: "Employees", url: "/employees" },
  { title: "Settings", url: "/settings" },
];

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute bottom-16 left-0 right-0 bg-background border-t border-border rounded-t-xl p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  className="block px-3 py-2.5 text-sm rounded-lg text-foreground hover:bg-accent transition-colors"
                  activeClassName="bg-primary/10 text-primary font-medium"
                  onClick={() => setMoreOpen(false)}
                >
                  {item.title}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-1.5">
          {mainItems.map((item) => {
            const isActive = item.url === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.url);
            return (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === "/"}
                className="flex flex-col items-center justify-center gap-0.5 min-w-[58px] px-2 py-1.5 rounded-xl text-muted-foreground transition-all active:scale-95"
                activeClassName="text-primary bg-primary/10"
              >
                <item.icon className="h-[22px] w-[22px]" />
                <span className="text-[10px] font-medium leading-none">{item.title}</span>
              </NavLink>
            );
          })}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-[58px] px-2 py-1.5 rounded-xl transition-all active:scale-95",
              moreOpen ? "text-primary bg-primary/10" : "text-muted-foreground"
            )}
          >
            {moreOpen ? <X className="h-[22px] w-[22px]" /> : <Menu className="h-[22px] w-[22px]" />}
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
