/**
 * Warehouse + stock hooks — Stage 9b.
 * Routes through the Laravel REST layer; previously-used Supabase realtime
 * subscription on warehouse_stock is replaced with periodic refetch
 * (refetchInterval) since Laravel does not provide WS broadcasts here.
 * Public hook names, query keys and response shapes are preserved.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { useToast } from "@/hooks/use-toast";
import { rest } from "@/lib/restResource";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

function aliasStockRow<T extends Record<string, any>>(r: T): T {
  if (!r) return r;
  return {
    ...r,
    products: r.products ?? r.product ?? null,
    product_variations: r.product_variations ?? r.variation ?? null,
    warehouses: r.warehouses ?? r.warehouse ?? null,
  };
}

export function useWarehouses() {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      // is_default desc, then name asc — REST sort syntax: "-is_default,name".
      // `is_default` isn't in the sort whitelist, so do client-side sort.
      const rows = await rest.all<Tables<"warehouses">>("warehouses", {
        sort: "name", perPage: 500,
      });
      return [...rows].sort((a, b) => {
        if (!!b.is_default !== !!a.is_default) return (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0);
        return (a.name ?? "").localeCompare(b.name ?? "");
      });
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
    mutationFn: async (w: TablesInsert<"warehouses">) => { await rest.create("warehouses", w as any); },
    onSuccess: () => { invalidate(); toast({ title: "Warehouse created" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"warehouses"> & { id: string }) => {
      await rest.update("warehouses", id, updates as any);
    },
    onSuccess: () => { invalidate(); toast({ title: "Warehouse updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await rest.remove("warehouses", id); },
    onSuccess: () => { invalidate(); toast({ title: "Warehouse deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: toFriendlyError(e), variant: "destructive" }),
  });

  return { create, update, remove };
}

export function useWarehouseStock(warehouseId?: string) {
  return useQuery({
    queryKey: ["warehouse_stock", warehouseId ?? "all"],
    queryFn: async () => {
      const rows = await rest.all<any>("warehouse_stock", {
        sort: "-updated_at",
        perPage: 500,
        with: ["product", "variation", "warehouse"],
        filter: warehouseId ? { warehouse_id: warehouseId } : undefined,
      });
      return rows.map(aliasStockRow);
    },
  });
}

/**
 * product_id → total on-hand quantity across warehouses.
 * Polls every 30s to replace the former Supabase realtime channel.
 */
export function useProductStockMap() {
  return useQuery({
    queryKey: ["product_stock_map"],
    queryFn: async () => {
      const rows = await rest.all<{ product_id: string | null; quantity: number | string }>(
        "warehouse_stock", { perPage: 5000 }
      );
      const map = new Map<string, number>();
      for (const row of rows) {
        if (!row.product_id) continue;
        map.set(row.product_id, (map.get(row.product_id) ?? 0) + Number(row.quantity || 0));
      }
      return map;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}