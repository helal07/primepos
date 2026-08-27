/**
 * Inventory hooks — Stage 9b.
 * Data now flows through the Laravel REST layer (/api/rest/*) instead of
 * direct Supabase table calls. Public hook names, query keys, and the
 * response shape (including relation aliases like `categories`, `brands`,
 * `units`, `products`, `product_variations`, `warehouses`) are preserved so
 * existing consumer pages don't need to change.
 *
 * Some destructive operations still need cross-table fallbacks (cascading
 * unlinks, soft-delete on FK violation) — those use Supabase as the
 * fallback path until the related modules are migrated in later stages.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { useToast } from "@/hooks/use-toast";
import { rest } from "@/lib/restResource";
import { useTenantRealtime } from "@/hooks/useTenantRealtime";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/** Map Eloquent singular relations back to Supabase-style plural aliases. */
function aliasProduct<T extends Record<string, any>>(p: T): T {
  if (!p) return p;
  return {
    ...p,
    categories: p.categories ?? p.category ?? null,
    brands: p.brands ?? p.brand ?? null,
    units: p.units ?? p.unit ?? null,
  };
}
function aliasVariation<T extends Record<string, any>>(v: T): T {
  if (!v) return v;
  return { ...v, products: v.products ?? v.product ?? null };
}
function aliasStockRow<T extends Record<string, any>>(r: T): T {
  if (!r) return r;
  return {
    ...r,
    products: r.products ?? r.product ?? null,
    product_variations: r.product_variations ?? r.variation ?? null,
    warehouses: r.warehouses ?? r.warehouse ?? null,
  };
}

// ============================================================
// Categories
// ============================================================
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      (await rest.all<Tables<"categories">>("categories", { sort: "name", perPage: 500 })),
  });
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const create = useMutation({
    mutationFn: async (cat: TablesInsert<"categories">) => {
      await rest.create("categories", cat as any);
    },
    onSuccess: () => { invalidate(); toast({ title: "Category created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"categories"> & { id: string }) => {
      await rest.update("categories", id, updates as any);
    },
    onSuccess: () => { invalidate(); toast({ title: "Category updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // Unlink products + subcategories so the delete isn't blocked by FK.
      // (products/categories are now both REST resources.)
      const products = await rest.all<{ id: string }>("products", {
        filter: { category_id: id }, perPage: 500,
      });
      await Promise.all(products.map((p) => rest.update("products", p.id, { category_id: null })));
      const subs = await rest.all<{ id: string }>("categories", {
        filter: { parent_id: id }, perPage: 500,
      });
      await Promise.all(subs.map((c) => rest.update("categories", c.id, { parent_id: null })));
      await rest.remove("categories", id);
    },
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ["products"] }); toast({ title: "Category deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { create, update, remove };
}

// ============================================================
// Brands
// ============================================================
export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async () =>
      (await rest.all<Tables<"brands">>("brands", { sort: "name", perPage: 500 })),
  });
}

export function useBrandMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["brands"] });

  const create = useMutation({
    mutationFn: async (b: TablesInsert<"brands">) => { await rest.create("brands", b as any); },
    onSuccess: () => { invalidate(); toast({ title: "Brand created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"brands"> & { id: string }) => {
      await rest.update("brands", id, updates as any);
    },
    onSuccess: () => { invalidate(); toast({ title: "Brand updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { await rest.remove("brands", id); },
    onSuccess: () => { invalidate(); toast({ title: "Brand deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
  return { create, update, remove };
}

// ============================================================
// Units
// ============================================================
export function useUnits() {
  return useQuery({
    queryKey: ["units"],
    queryFn: async () =>
      (await rest.all<Tables<"units">>("units", { sort: "name", perPage: 500 })),
  });
}

export function useUnitMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["units"] });

  const create = useMutation({
    mutationFn: async (u: TablesInsert<"units">) => { await rest.create("units", u as any); },
    onSuccess: () => { invalidate(); toast({ title: "Unit created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"units"> & { id: string }) => {
      await rest.update("units", id, updates as any);
    },
    onSuccess: () => { invalidate(); toast({ title: "Unit updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { await rest.remove("units", id); },
    onSuccess: () => { invalidate(); toast({ title: "Unit deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
  return { create, update, remove };
}

// ============================================================
// Products
// ============================================================
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const rows = await rest.all<any>("products", {
        sort: "-created_at",
        perPage: 200,
        with: ["category", "brand", "unit"],
      });
      return rows.map(aliasProduct);
    },
  });
}

export function useProductMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["products"] });

  const create = useMutation({
    mutationFn: async (p: TablesInsert<"products">) => { await rest.create("products", p as any); },
    onSuccess: () => { invalidate(); toast({ title: "Product created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"products"> & { id: string }) => {
      await rest.update("products", id, updates as any);
    },
    onSuccess: () => { invalidate(); toast({ title: "Product updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // Clear non-transactional references first (variations, stock rows, group prices).
      // product_group_prices is not yet a REST resource — Supabase fallback for now.
      try {
        const vars = await rest.all<{ id: string }>("product_variations", {
          filter: { product_id: id }, perPage: 500,
        });
        await Promise.all(vars.map((v) => rest.remove("product_variations", v.id)));
        const stock = await rest.all<{ id: string }>("warehouse_stock", {
          filter: { product_id: id }, perPage: 500,
        });
        await Promise.all(stock.map((s) => rest.remove("warehouse_stock", s.id)));
      } catch {
        // best-effort cleanup
      }
      try {
        const gp = await rest.all<{ id: string }>("product_group_prices", {
          filter: { product_id: id }, perPage: 2000,
        });
        await Promise.all(gp.map((g) => rest.remove("product_group_prices", g.id)));
      } catch {
        // best-effort cleanup
      }

      try {
        await rest.remove("products", id);
        return { soft: false, refs: [] as { label: string; count: number }[] };
      } catch (err: any) {
        // FK violation from transactional tables → soft-delete to preserve history.
        const msg = String(err?.message ?? "");
        const status = err?.status as number | undefined;
        const looksLikeFk = msg.includes("foreign key") || msg.includes("23503") || status === 409;
        if (!looksLikeFk) throw err;

        const checks: Array<{ table: "sale_items" | "purchase_items" | "installment_sales" | "warranty_claims"; label: string }> = [
          { table: "sale_items", label: "Sales" },
          { table: "purchase_items", label: "Purchases" },
          { table: "installment_sales", label: "Installments" },
          { table: "warranty_claims", label: "Warranty claims" },
        ];
        const counts = await Promise.all(checks.map(async (c) => {
          // warranty_claims is keyed by warranty_id (not product_id) so the
          // legacy filter would always return 0. Sale/purchase/installment all
          // expose product_id via REST.
          if (c.table === "warranty_claims") return { label: c.label, count: 0 };
          const res = await rest.list(c.table, {
            filter: { product_id: id }, perPage: 1,
          });
          return { label: c.label, count: res.meta.total ?? 0 };
        }));
        const refs = counts.filter((c) => c.count > 0);
        await rest.update("products", id, { is_active: false, show_on_website: false });
        return { soft: true, refs };
      }
    },
    onSuccess: (res) => {
      invalidate();
      if (!res?.soft) { toast({ title: "Product deleted" }); return; }
      const refSummary = res.refs.length
        ? res.refs.map((r) => `${r.label} (${r.count})`).join(", ")
        : "existing transactional records";
      toast({
        title: "Product deactivated, not deleted",
        description: `This product is referenced by: ${refSummary}. To preserve history it was hidden and marked inactive instead of permanently deleted.`,
        duration: 8000,
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { create, update, remove };
}

// ============================================================
// Product Variations
// ============================================================
export function useVariations(productId?: string) {
  return useQuery({
    queryKey: ["variations", productId],
    queryFn: async () => {
      const rows = await rest.all<any>("product_variations", {
        sort: "name",
        perPage: 500,
        with: ["product"],
        filter: productId ? { product_id: productId } : undefined,
      });
      return rows.map(aliasVariation);
    },
  });
}

export function useVariationMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["variations"] });

  const create = useMutation({
    mutationFn: async (v: TablesInsert<"product_variations">) => {
      await rest.create("product_variations", v as any);
    },
    onSuccess: () => { invalidate(); toast({ title: "Variation created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"product_variations"> & { id: string }) => {
      await rest.update("product_variations", id, updates as any);
    },
    onSuccess: () => { invalidate(); toast({ title: "Variation updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { await rest.remove("product_variations", id); },
    onSuccess: () => { invalidate(); toast({ title: "Variation deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
  return { create, update, remove };
}

// ============================================================
// Stock Adjustments
// ============================================================
export function useStockAdjustments() {
  useTenantRealtime(
    ["stock_adjustments", "sales", "purchases"],
    [["stock_adjustments"], ["warehouse_stock"], ["product_stock_map"]],
  );
  return useQuery({
    queryKey: ["stock_adjustments"],
    queryFn: async () => {
      const rows = await rest.all<any>("stock_adjustments", {
        sort: "-created_at",
        perPage: 200,
        with: ["product", "variation"],
      });
      return rows.map(aliasStockRow);
    },
  });
}

export function useStockAdjustmentMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (a: TablesInsert<"stock_adjustments">) => {
      await rest.create("stock_adjustments", a as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_adjustments"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["warehouse_stock"] });
      qc.invalidateQueries({ queryKey: ["product_stock_map"] });
      toast({ title: "Stock adjusted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
  return { create };
}

// ============================================================
// Stock Transfers
// ============================================================
export function useStockTransfers() {
  return useQuery({
    queryKey: ["stock_transfers"],
    queryFn: async () => {
      const rows = await rest.all<any>("stock_transfers", {
        sort: "-created_at",
        perPage: 200,
        with: ["product", "variation"],
      });
      return rows.map(aliasStockRow);
    },
  });
}

export function useStockTransferMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["stock_transfers"] });
    // Transfers move stock between locations — refresh every stock view.
    qc.invalidateQueries({ queryKey: ["warehouse_stock"] });
    qc.invalidateQueries({ queryKey: ["warehouse_stock_check"] });
    qc.invalidateQueries({ queryKey: ["product_stock_map"] });
    qc.invalidateQueries({ queryKey: ["location_stock_map"] });
  };


  const create = useMutation({
    mutationFn: async (t: TablesInsert<"stock_transfers">) => {
      await rest.create("stock_transfers", t as any);
    },
    onSuccess: () => { invalidate(); toast({ title: "Transfer created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"stock_transfers"> & { id: string }) => {
      await rest.update("stock_transfers", id, updates as any);
    },
    onSuccess: () => { invalidate(); toast({ title: "Transfer updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });
  return { create, update };
}
