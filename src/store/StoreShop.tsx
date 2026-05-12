import { useOutletContext, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStoreCategories, useStoreProducts } from "@/hooks/useStorefront";
import { ProductCard } from "./components/ProductCard";
import type { StoreCtx } from "./StoreLayout";

export default function StoreShop() {
  const { tenant, settings } = useOutletContext<StoreCtx>();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const categoryId = params.get("category") ?? undefined;
  const { data: categories } = useStoreCategories(tenant.id);
  const { data: products, isLoading } = useStoreProducts(tenant.id, { search, categoryId });
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Shop</h1>
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <Input placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); const n = new URLSearchParams(params); if (e.target.value) n.set("q", e.target.value); else n.delete("q"); setParams(n, { replace: true }); }} className="md:max-w-sm" />
        <Select value={categoryId ?? "all"} onValueChange={(v) => { const n = new URLSearchParams(params); if (v === "all") n.delete("category"); else n.set("category", v); setParams(n, { replace: true }); }}>
          <SelectTrigger className="md:w-56"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All categories</SelectItem>{(categories ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : products && products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{products.map((p: any) => <ProductCard key={p.id} product={p} tenantSlug={tenant.slug} currency={settings.currency} tenantId={tenant.id} />)}</div>
      ) : <p className="text-muted-foreground py-12 text-center">No products found.</p>}
    </div>
  );
}
