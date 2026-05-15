import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export function useWarehouses() {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return data as Tables<"warehouses">[];
    },
  });
}

export function useDefaultWarehouse() {
  const { data } = useWarehouses();
  return data?.find((w) => w.is_default) ?? data?.[0] ?? null;
}

export function useWarehouseMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["warehouses"] });

  const create = useMutation({
    mutationFn: async (w: TablesInsert<"warehouses">) => {
      const { error } = await supabase.from("warehouses").insert(w);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Warehouse created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"warehouses"> & { id: string }) => {
      const { error } = await supabase.from("warehouses").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Warehouse updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warehouses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Warehouse deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { create, update, remove };
}

export function useWarehouseStock(warehouseId?: string) {
  return useQuery({
    queryKey: ["warehouse_stock", warehouseId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("warehouse_stock")
        .select("*, products(name, sku, alert_quantity, purchase_price, selling_price), product_variations(name, sku), warehouses(name, code)")
        .order("updated_at", { ascending: false });
      if (warehouseId) q = q.eq("warehouse_id", warehouseId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Returns a Map of product_id -> total on-hand quantity across all warehouses.
 * Used by POS to show real stock instead of the (often stale) products.stock_quantity column.
 */
export function useProductStockMap() {
  return useQuery({
    queryKey: ["product_stock_map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_stock")
        .select("product_id, quantity");
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data ?? []) {
        if (!row.product_id) continue;
        map.set(row.product_id, (map.get(row.product_id) ?? 0) + Number(row.quantity || 0));
      }
      return map;
    },
  });
}