import { Link, useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useStoreCollections } from "@/hooks/useStorefront";
import type { StoreCtx } from "./StoreLayout";
export default function StoreCollections() {
  const { tenant, base } = useOutletContext<StoreCtx>();
  const { data: collections } = useStoreCollections(tenant.id);
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Collections</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {(collections ?? []).map((c: any) => (
          <Link key={c.id} to={`${base}/collection/${c.slug}`}>
            <Card className="overflow-hidden hover:shadow-md transition">
              {c.image_url && <img src={c.image_url} alt={c.name} className="aspect-square w-full object-cover" />}
              <CardContent className="p-3 text-center font-medium">{c.name}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
