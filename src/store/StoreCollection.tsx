import { useOutletContext, useParams } from "react-router-dom";
import { useCollectionProducts } from "@/hooks/useStorefront";
import { ProductCard } from "./components/ProductCard";
import type { StoreCtx } from "./StoreLayout";
export default function StoreCollection() {
  const { tenant, settings, base } = useOutletContext<StoreCtx>();
  const { collectionSlug } = useParams();
  const { data, isLoading } = useCollectionProducts(tenant.id, collectionSlug);
  if (isLoading) return <div className="container mx-auto px-4 py-8">Loading…</div>;
  if (!data?.collection) return <div className="container mx-auto px-4 py-8">Collection not found</div>;
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">{data.collection.name}</h1>
      {data.collection.description && <p className="text-muted-foreground mt-1">{data.collection.description}</p>}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.products.map((p: any) => <ProductCard key={p.id} product={p} tenantSlug={tenant.slug} currency={settings.currency} tenantId={tenant.id} />)}
      </div>
      {data.products.length === 0 && <p className="text-muted-foreground py-8 text-center">No products in this collection yet.</p>}
    </div>
  );
}
