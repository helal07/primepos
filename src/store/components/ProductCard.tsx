import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { cn } from "@/lib/utils";

export function ProductCard({ product, tenantSlug, currency, tenantId }: { product: any; tenantSlug: string; currency: string; tenantId?: string }) {
  const slug = product.website_slug ?? product.id;
  const { ids, toggle } = useWishlist(tenantId);
  const liked = ids.has(product.id);
  return (
    <div className="relative group h-full">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); toggle.mutate(product.id); }}
        className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background"
        aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart className={cn("h-4 w-4", liked ? "fill-destructive text-destructive" : "text-muted-foreground")} />
      </button>
      <Link to={`/store/${tenantSlug}/product/${slug}`}>
        <Card className="overflow-hidden hover:shadow-md transition h-full flex flex-col">
          <div className="aspect-square bg-muted relative overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No image</div>
            )}
          </div>
          <CardContent className="p-3 flex-1 flex flex-col">
            <p className="font-medium line-clamp-2 text-sm">{product.name}</p>
            <p className="mt-auto pt-2 font-semibold text-primary">
              {currency} {Number(product.selling_price).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
