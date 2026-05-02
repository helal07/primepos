import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type SellingPriceGroup = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export type CustomerGroup = {
  id: string;
  name: string;
  description: string | null;
  selling_price_group_id: string | null;
  is_active: boolean;
};

export type ProductGroupPrice = {
  id: string;
  product_id: string;
  variation_id: string | null;
  selling_price_group_id: string;
  price: number;
  price_type: "fixed" | "percent";
};

// ---------- Selling price groups ----------
export function useSellingPriceGroups() {
  return useQuery({
    queryKey: ["selling_price_groups"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("selling_price_groups")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as SellingPriceGroup[];
    },
  });
}

export function useSellingPriceGroupMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["selling_price_groups"] });

  const create = useMutation({
    mutationFn: async (g: Omit<SellingPriceGroup, "id">) => {
      const { error } = await (supabase as any).from("selling_price_groups").insert(g);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Price group created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SellingPriceGroup> & { id: string }) => {
      const { error } = await (supabase as any).from("selling_price_groups").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Price group updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("selling_price_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Price group deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { create, update, remove };
}

// ---------- Customer groups ----------
export function useCustomerGroups() {
  return useQuery({
    queryKey: ["customer_groups"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customer_groups")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as CustomerGroup[];
    },
  });
}

export function useCustomerGroupMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["customer_groups"] });

  const create = useMutation({
    mutationFn: async (g: Omit<CustomerGroup, "id">) => {
      const { error } = await (supabase as any).from("customer_groups").insert(g);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Customer group created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomerGroup> & { id: string }) => {
      const { error } = await (supabase as any).from("customer_groups").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Customer group updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("customer_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Customer group deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { create, update, remove };
}

// ---------- Product group price overrides ----------
export function useProductGroupPrices(productId?: string | null) {
  return useQuery({
    queryKey: ["product_group_prices", productId ?? "all"],
    queryFn: async () => {
      let q = (supabase as any).from("product_group_prices").select("*");
      if (productId) q = q.eq("product_id", productId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProductGroupPrice[];
    },
  });
}

export function useProductGroupPricesMap() {
  // Returns a map keyed by `${product_id}:${variation_id ?? 'base'}:${group_id}`
  return useQuery({
    queryKey: ["product_group_prices_map"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("product_group_prices")
        .select("*");
      if (error) throw error;
      const map: Record<string, { price: number; price_type: "fixed" | "percent" }> = {};
      for (const r of (data ?? []) as ProductGroupPrice[]) {
        const key = `${r.product_id}:${r.variation_id ?? "base"}:${r.selling_price_group_id}`;
        map[key] = { price: Number(r.price), price_type: r.price_type };
      }
      return map;
    },
  });
}

export function useProductGroupPriceMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["product_group_prices"] });
    qc.invalidateQueries({ queryKey: ["product_group_prices_map"] });
  };

  const upsert = useMutation({
    mutationFn: async (rows: Array<Omit<ProductGroupPrice, "id">>) => {
      if (!rows.length) return;
      const { error } = await (supabase as any)
        .from("product_group_prices")
        .upsert(rows, { onConflict: "product_id,variation_id,selling_price_group_id" });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("product_group_prices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return { upsert, remove };
}