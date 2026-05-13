import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// Categories
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data as Tables<"categories">[];
    },
  });
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const create = useMutation({
    mutationFn: async (cat: TablesInsert<"categories">) => {
      const { error } = await supabase.from("categories").insert(cat);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Category created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"categories"> & { id: string }) => {
      const { error } = await supabase.from("categories").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Category updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // Unlink products from this category so deletion is not blocked by FK
      await supabase.from("products").update({ category_id: null }).eq("category_id", id);
      // Unlink any subcategories
      await supabase.from("categories").update({ parent_id: null }).eq("parent_id", id);
      const { data, error } = await supabase.from("categories").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Delete blocked. You may not have permission to delete this category.");
    },
    onSuccess: () => { invalidate(); toast({ title: "Category deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { create, update, remove };
}

// Brands
export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      return data as Tables<"brands">[];
    },
  });
}

export function useBrandMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["brands"] });

  const create = useMutation({
    mutationFn: async (b: TablesInsert<"brands">) => {
      const { error } = await supabase.from("brands").insert(b);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Brand created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"brands"> & { id: string }) => {
      const { error } = await supabase.from("brands").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Brand updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("brands").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Delete blocked. You may not have permission, or the item is referenced by other records.");
    },
    onSuccess: () => { invalidate(); toast({ title: "Brand deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { create, update, remove };
}

// Units
export function useUnits() {
  return useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*").order("name");
      if (error) throw error;
      return data as Tables<"units">[];
    },
  });
}

export function useUnitMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["units"] });

  const create = useMutation({
    mutationFn: async (u: TablesInsert<"units">) => {
      const { error } = await supabase.from("units").insert(u);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Unit created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"units"> & { id: string }) => {
      const { error } = await supabase.from("units").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Unit updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("units").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Delete blocked. You may not have permission, or the item is referenced by other records.");
    },
    onSuccess: () => { invalidate(); toast({ title: "Unit deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { create, update, remove };
}

// Products
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name), brands(name), units(name, short_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useProductMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["products"] });

  const create = useMutation({
    mutationFn: async (p: TablesInsert<"products">) => {
      const { error } = await supabase.from("products").insert(p);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Product created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"products"> & { id: string }) => {
      const { error } = await supabase.from("products").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Product updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // First, clear non-transactional references that should not block deletion.
      // These are safe to remove because they don't represent historical records.
      await supabase.from("product_variations").delete().eq("product_id", id);
      await supabase.from("warehouse_stock").delete().eq("product_id", id);
      await supabase.from("product_group_prices").delete().eq("product_id", id);
      await supabase.from("store_collection_products").delete().eq("product_id", id);

      const { data: deleted, error } = await supabase.from("products").delete().eq("id", id).select("id");
      if (error) {
        // Foreign key violation — product is referenced by sales/purchases/etc.
        // Fall back to soft-delete so transactional history is preserved.
        if ((error as any).code === "23503") {
          // Discover which transactional tables still reference this product
          const checks: Array<{ table: "sale_items" | "purchase_items" | "installment_sales" | "warranty_claims" | "store_order_items"; label: string }> = [
            { table: "sale_items", label: "Sales" },
            { table: "purchase_items", label: "Purchases" },
            { table: "installment_sales", label: "Installments" },
            { table: "warranty_claims", label: "Warranty claims" },
            { table: "store_order_items", label: "Website orders" },
          ];
          const counts = await Promise.all(
            checks.map(async (c) => {
              const { count } = await supabase
                .from(c.table)
                .select("id", { count: "exact", head: true })
                .eq("product_id", id);
              return { label: c.label, count: count ?? 0 };
            })
          );
          const refs = counts.filter((c) => c.count > 0);
          const { error: updErr } = await supabase
            .from("products")
            .update({ is_active: false, show_on_website: false })
            .eq("id", id);
          if (updErr) throw updErr;
          return { soft: true, refs };
        }
        throw error;
      }
      if (!deleted || deleted.length === 0) throw new Error("Delete blocked. You may not have permission to delete this product.");
      return { soft: false, refs: [] as { label: string; count: number }[] };
    },
    onSuccess: (res) => {
      invalidate();
      if (!res?.soft) {
        toast({ title: "Product deleted" });
        return;
      }
      const refSummary = res.refs.length
        ? res.refs.map((r) => `${r.label} (${r.count})`).join(", ")
        : "existing transactional records";
      toast({
        title: "Product deactivated, not deleted",
        description: `This product is referenced by: ${refSummary}. To preserve history it was hidden and marked inactive instead of permanently deleted.`,
        duration: 8000,
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { create, update, remove };
}

// Product Variations
export function useVariations(productId?: string) {
  return useQuery({
    queryKey: ["variations", productId],
    queryFn: async () => {
      let q = supabase.from("product_variations").select("*, products(name)").order("name");
      if (productId) q = q.eq("product_id", productId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useVariationMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["variations"] });

  const create = useMutation({
    mutationFn: async (v: TablesInsert<"product_variations">) => {
      const { error } = await supabase.from("product_variations").insert(v);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Variation created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"product_variations"> & { id: string }) => {
      const { error } = await supabase.from("product_variations").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Variation updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_variations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Variation deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { create, update, remove };
}

// Stock Adjustments
export function useStockAdjustments() {
  return useQuery({
    queryKey: ["stock_adjustments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_adjustments")
        .select("*, products(name), product_variations(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export function useStockAdjustmentMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (a: TablesInsert<"stock_adjustments">) => {
      const { error } = await supabase.from("stock_adjustments").insert(a);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_adjustments"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Stock adjusted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { create };
}

// Stock Transfers
export function useStockTransfers() {
  return useQuery({
    queryKey: ["stock_transfers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_transfers")
        .select("*, products(name), product_variations(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
}

export function useStockTransferMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["stock_transfers"] });

  const create = useMutation({
    mutationFn: async (t: TablesInsert<"stock_transfers">) => {
      const { error } = await supabase.from("stock_transfers").insert(t);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Transfer created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"stock_transfers"> & { id: string }) => {
      const { error } = await supabase.from("stock_transfers").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Transfer updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { create, update };
}
