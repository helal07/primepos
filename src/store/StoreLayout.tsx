import { Link, Outlet, useParams } from "react-router-dom";
import { useEffect } from "react";
import { ShoppingCart, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTenantBySlug, useStoreSettings } from "@/hooks/useStorefront";
import { CartProvider, useCart } from "@/contexts/CartContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

function CartButton({ slug }: { slug: string }) {
  const { count } = useCart();
  return (
    <Button asChild variant="outline" size="sm" className="relative">
      <Link to={`/store/${slug}/cart`}>
        <ShoppingCart className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
            {count}
          </span>
        )}
      </Link>
    </Button>
  );
}

function StoreShell() {
  const { tenantSlug } = useParams();
  const { data: tenant, isLoading: loadingTenant } = useTenantBySlug(tenantSlug);
  const { data: settings, isLoading: loadingSettings } = useStoreSettings(tenant?.id);

  useEffect(() => {
    if (settings?.meta_title || settings?.store_name) {
      document.title = settings.meta_title ?? `${settings.store_name} – Store`;
    }
    if (settings?.meta_description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
      }
      m.setAttribute("content", settings.meta_description);
    }
  }, [settings]);

  if (loadingTenant || loadingSettings) {
    return (
      <div className="min-h-screen p-8 space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tenant || !settings || !settings.enabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-3xl font-bold">Store not available</h1>
        <p className="text-muted-foreground mt-2">This store is currently offline or doesn't exist.</p>
      </div>
    );
  }

  const name = settings.store_name ?? tenant.name;
  const navLinks = [
    { to: `/store/${tenantSlug}`, label: "Home" },
    { to: `/store/${tenantSlug}/shop`, label: "Shop" },
    { to: `/store/${tenantSlug}/collections`, label: "Collections" },
  ];

  return (
    <CartProvider tenantSlug={tenantSlug!}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="container mx-auto flex items-center gap-4 h-16 px-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <nav className="flex flex-col gap-2 mt-6">
                  {navLinks.map((l) => (
                    <Link key={l.to} to={l.to} className="px-3 py-2 rounded hover:bg-accent">
                      {l.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <Link to={`/store/${tenantSlug}`} className="flex items-center gap-2 font-bold text-lg">
              {settings.logo_url && <img src={settings.logo_url} alt={name} className="h-8 w-8 rounded object-cover" />}
              <span>{name}</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to} className="px-3 py-2 rounded text-sm hover:bg-accent">
                  {l.label}
                </Link>
              ))}
            </nav>
            <form
              className="ml-auto hidden sm:flex items-center gap-2 max-w-xs flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const q = String(fd.get("q") ?? "");
                window.location.href = `/store/${tenantSlug}/shop?q=${encodeURIComponent(q)}`;
              }}
            >
              <div className="relative w-full">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input name="q" placeholder="Search products..." className="pl-8 h-9" />
              </div>
            </form>
            <CartButton slug={tenantSlug!} />
          </div>
        </header>
        <main className="flex-1">
          <Outlet context={{ tenant, settings }} />
        </main>
        <footer className="border-t mt-12 bg-muted/30">
          <div className="container mx-auto px-4 py-8 grid gap-8 md:grid-cols-3 text-sm">
            <div>
              <h3 className="font-semibold mb-2">{name}</h3>
              {settings.tagline && <p className="text-muted-foreground">{settings.tagline}</p>}
            </div>
            <div>
              <h4 className="font-medium mb-2">Contact</h4>
              <ul className="space-y-1 text-muted-foreground">
                {settings.contact_email && <li>{settings.contact_email}</li>}
                {settings.contact_phone && <li>{settings.contact_phone}</li>}
                {settings.address && <li>{settings.address}</li>}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Follow</h4>
              <ul className="space-y-1 text-muted-foreground">
                {settings.facebook_url && <li><a href={settings.facebook_url} target="_blank" rel="noreferrer">Facebook</a></li>}
                {settings.instagram_url && <li><a href={settings.instagram_url} target="_blank" rel="noreferrer">Instagram</a></li>}
                {settings.whatsapp_number && <li>WhatsApp: {settings.whatsapp_number}</li>}
              </ul>
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground py-4 border-t">© {new Date().getFullYear()} {name}</div>
        </footer>
      </div>
    </CartProvider>
  );
}

export default StoreShell;

export interface StoreCtx {
  tenant: { id: string; name: string; slug: string };
  settings: import("@/hooks/useStorefront").StoreSettings;
}
