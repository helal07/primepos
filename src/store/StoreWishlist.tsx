import { useOutletContext, Link } from "react-router-dom";
import type { StoreCtx } from "./StoreLayout";
import { useWishlist } from "@/hooks/useWishlist";
import { ProductCard } from "./components/ProductCard";
import { Heart } from "lucide-react";

export default function StoreWishlist() {
  const { tenant, settings, base } = useOutletContext<StoreCtx>();
  const { items } = useWishlist(tenant.id);
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Heart className="h-6 w-6" /> My Wishlist</h1>
      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Your wishlist is empty. <Link className="text-primary underline" to={`${base}/shop`}>Browse products</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((i: any) => i.products && (
            <ProductCard key={i.id} product={i.products} tenantSlug={tenant.slug} currency={settings.currency} tenantId={tenant.id} base={base} />
          ))}
        </div>
      )}
    </div>
  );
}