import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";

/**
 * Available IMEI / serial numbers for a product.
 * When `warehouseId` is provided, only serials purchased into that business
 * location are offered (Ultimate POS style per-location stock).
 */
export function useAvailableSerials(productId: string | null, warehouseId?: string | null) {
  return useQuery({
    queryKey: ["available_serials", productId, warehouseId ?? "all"],
    enabled: !!productId,
    queryFn: async () => {
      const [purchased, exchanged, sold] = await Promise.all([
        rest.all<{ serial_number: string | null; purchase_id: string | null }>("purchase_items", {
          filter: { product_id: productId! }, perPage: 2000,
        }),
        rest.all<{ imei: string | null }>("exchange_purchases", {
          filter: { linked_product_id: productId!, status: "in_stock" }, perPage: 2000,

        }),
        rest.all<{ serial_number: string | null }>("sale_items", {
          filter: { product_id: productId! }, perPage: 2000,
        }),
      ]);

      let purchasedRows = purchased;
      if (warehouseId) {
        const purchases = await rest.all<{ id: string }>("purchases", {
          filter: { warehouse_id: warehouseId }, perPage: 2000,
        });
        const allowed = new Set(purchases.map((p) => p.id));
        purchasedRows = purchased.filter((p) => p.purchase_id && allowed.has(p.purchase_id));
      }

      const soldSet = new Set(sold.map((s) => s.serial_number).filter(Boolean));
      const all = [
        ...purchasedRows.map((p) => p.serial_number).filter((v): v is string => !!v),
        ...exchanged.map((e) => e.imei).filter((v): v is string => !!v),
      ].filter(Boolean);
      // dedupe and exclude sold
      return Array.from(new Set(all)).filter((sn) => !soldSet.has(sn as any));
    },
  });
}
