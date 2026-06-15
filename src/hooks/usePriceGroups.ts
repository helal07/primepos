import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { rest } from "@/lib/restResource";
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
      return await rest.all<SellingPriceGroup>("selling_price_groups", { sort: "name", perPage: 500 });
    },
  });
}

export function useSellingPriceGroupMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["selling_price_groups"] });

  const create = useMutation({
    mutationFn: async (g: Omit<SellingPriceGroup, "id">) => {
      await rest.create("selling_price_groups", g);
    },
    onSuccess: () => { invalidate(); toast({ title: "Price group created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SellingPriceGroup> & { id: string }) => {
      await rest.update("selling_price_groups", id, updates);
    },
    onSuccess: () => { invalidate(); toast({ title: "Price group updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await rest.remove("selling_price_groups", id);
    },
    onSuccess: () => { invalidate(); toast({ title: "Price group deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { create, update, remove };
}

// ---------- Customer groups ----------
export function useCustomerGroups() {
  return useQuery({
    queryKey: ["customer_groups"],
    queryFn: async () => {
      return await rest.all<CustomerGroup>("customer_groups", { sort: "name", perPage: 500 });
    },
  });
}

export function useCustomerGroupMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["customer_groups"] });

  const create = useMutation({
    mutationFn: async (g: Omit<CustomerGroup, "id">) => {
      await rest.create("customer_groups", g);
    },
    onSuccess: () => { invalidate(); toast({ title: "Customer group created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomerGroup> & { id: string }) => {
      await rest.update("customer_groups", id, updates);
    },
    onSuccess: () => { invalidate(); toast({ title: "Customer group updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await rest.remove("customer_groups", id);
    },
    onSuccess: () => { invalidate(); toast({ title: "Customer group deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { create, update, remove };
}

// ---------- Product group price overrides ----------
export function useProductGroupPrices(productId?: string | null) {
  return useQuery({
    queryKey: ["product_group_prices", productId ?? "all"],
    queryFn: async () => {
      return await rest.all<ProductGroupPrice>("product_group_prices", {
        filter: productId ? { product_id: productId } : undefined,
        perPage: 2000,
      });
    },
  });
}

export function useProductGroupPricesMap() {
  // Returns a map keyed by `${product_id}:${variation_id ?? 'base'}:${group_id}`
  return useQuery({
    queryKey: ["product_group_prices_map"],
    queryFn: async () => {
      const data = await rest.all<ProductGroupPrice>("product_group_prices", { perPage: 5000 });
      const map: Record<string, { price: number; price_type: "fixed" | "percent" }> = {};
      for (const r of data) {
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
      // No native upsert: for each row, look up existing (product_id, variation_id, selling_price_group_id)
      // and update; otherwise create.
      await Promise.all(rows.map(async (r) => {
        const filter: Record<string, any> = {
          product_id: r.product_id,
          selling_price_group_id: r.selling_price_group_id,
        };
        if (r.variation_id) filter.variation_id = r.variation_id;
        const existing = await rest.all<ProductGroupPrice>("product_group_prices", { filter, perPage: 1 });
        const found = existing.find((e) => (e.variation_id ?? null) === (r.variation_id ?? null));
        if (found) {
          await rest.update("product_group_prices", found.id, { price: r.price, price_type: r.price_type });
        } else {
          await rest.create("product_group_prices", r);
        }
      }));
    },
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await rest.remove("product_group_prices", id);
    },
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { upsert, remove };
}