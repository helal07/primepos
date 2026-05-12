import { Link, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStoreCollections, useStoreProducts } from "@/hooks/useStorefront";
import type { StoreCtx } from "./StoreLayout";
import { ProductCard } from "./components/ProductCard";

export default function StoreHome() {
  const { tenant, settings, base } = useOutletContext<StoreCtx>();
  const { data: collections } = useStoreCollections(tenant.id);
  const { data: products } = useStoreProducts(tenant.id, { limit: 8 });

  return (
    <div>
      <section
        className="relative bg-gradient-to-br from-primary/10 via-background to-accent/20 py-16 md:py-24"
        style={settings.banner_url ? { backgroundImage: `url(${settings.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
      >
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {settings.hero_heading ?? `Welcome to ${settings.store_name ?? tenant.name}`}
          </h1>
          {settings.hero_subheading && (
            <p className="mt-4 text-lg text-muted-foreground">{settings.hero_subheading}</p>
          )}
          <Button asChild size="lg" className="mt-6">
            <Link to={settings.hero_cta_url ?? `${base}/shop`}>
              {settings.hero_cta_label ?? "Shop now"}
            </Link>
          </Button>
        </div>
      </section>

      {collections && collections.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-semibold mb-6">Shop by collection</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {collections.slice(0, 4).map((c: any) => (
              <Link key={c.id} to={`${base}/collection/${c.slug}`}>
                <Card className="overflow-hidden hover:shadow-md transition">
                  {c.image_url && <img src={c.image_url} alt={c.name} className="aspect-square object-cover w-full" />}
                  <CardContent className="p-3 text-center font-medium">{c.name}</CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-semibold">Featured products</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to={`${base}/shop`}>View all</Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(products ?? []).map((p: any) => (
            <ProductCard key={p.id} product={p} tenantSlug={tenant.slug} currency={settings.currency} tenantId={tenant.id} base={base} />
          ))}
        </div>
      </section>
    </div>
  );
}
