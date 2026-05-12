import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

export function ProductCard({ product, tenantSlug, currency }: { product: any; tenantSlug: string; currency: string }) {
  const slug = product.website_slug ?? product.id;
  return (
    <Link to={`/store/${tenantSlug}/product/${slug}`}>
      <Card className="overflow-hidden hover:shadow-md transition group h-full flex flex-col">
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
  );
}
