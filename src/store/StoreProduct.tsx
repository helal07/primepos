import { useOutletContext, useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreProduct } from "@/hooks/useStorefront";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import type { StoreCtx } from "./StoreLayout";

export default function StoreProduct() {
  const { tenant, settings, base } = useOutletContext<StoreCtx>();
  const { productSlug } = useParams();
  const { data: product, isLoading } = useStoreProduct(tenant.id, productSlug);
  const { add } = useCart();
  const [variationId, setVariationId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [imgIx, setImgIx] = useState(0);
  if (isLoading) return <div className="container mx-auto px-4 py-8"><Skeleton className="h-64 w-full" /></div>;
  if (!product) return <div className="container mx-auto px-4 py-16 text-center"><h1 className="text-2xl">Product not found</h1><Button asChild variant="link"><Link to={`${base}/shop`}>Back to shop</Link></Button></div>;
  const variations = (product.product_variations ?? []).filter((v: any) => v.is_active);
  const selectedVar = variations.find((v: any) => v.id === variationId);
  const price = selectedVar?.selling_price ?? product.selling_price;
  const stock = selectedVar?.stock_quantity ?? product.stock_quantity;
  const gallery: string[] = [product.image_url, ...(product.gallery_urls ?? [])].filter(Boolean);
  const handleAdd = () => {
    if (variations.length > 0 && !variationId) { toast.error("Please choose a variation"); return; }
    add({ productId: product.id, variationId, name: selectedVar ? `${product.name} – ${selectedVar.name}` : product.name, price: Number(price), qty, imageUrl: product.image_url });
    toast.success("Added to cart");
  };
  return (
    <div className="container mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
      <div>
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">{gallery[imgIx] ? <img src={gallery[imgIx]} alt={product.name} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-muted-foreground">No image</div>}</div>
        {gallery.length > 1 && <div className="flex gap-2 mt-3">{gallery.map((g, i) => <button key={i} type="button" onClick={() => setImgIx(i)} className={`h-16 w-16 rounded border ${i === imgIx ? "border-primary" : "border-border"}`}><img src={g} alt="" className="w-full h-full object-cover rounded" /></button>)}</div>}
      </div>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="text-2xl font-semibold text-primary">{settings.currency} {Number(price).toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">{stock > 0 ? `${stock} in stock` : "Out of stock"}</p>
        {variations.length > 0 && <div><p className="text-sm font-medium mb-2">Variation</p><div className="flex flex-wrap gap-2">{variations.map((v: any) => <button key={v.id} type="button" onClick={() => setVariationId(v.id)} className={`px-3 py-1.5 rounded border text-sm ${variationId === v.id ? "border-primary bg-primary/10" : "border-border"}`}>{v.name}</button>)}</div></div>}
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded"><button type="button" className="px-3 py-1.5" onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button><span className="px-3">{qty}</span><button type="button" className="px-3 py-1.5" onClick={() => setQty((q) => q + 1)}>+</button></div>
          <Button onClick={handleAdd} disabled={stock <= 0}>Add to cart</Button>
        </div>
        <div className="prose prose-sm max-w-none pt-4 border-t"><p className="whitespace-pre-wrap">{product.website_description ?? product.description}</p></div>
      </div>
    </div>
  );
}
