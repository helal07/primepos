import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";

export function useAvailableSerials(productId: string | null) {
  return useQuery({
    queryKey: ["available_serials", productId],
    enabled: !!productId,
    queryFn: async () => {
      const [purchased, exchanged, sold] = await Promise.all([
        rest.all<{ serial_number: string | null }>("purchase_items", {
          filter: { product_id: productId! }, perPage: 2000,
        }),
        rest.all<{ imei: string | null }>("exchange_purchases", {
          filter: { linked_product_id: productId!, status: "in_stock" }, perPage: 2000,
        }),
        rest.all<{ serial_number: string | null }>("sale_items", {
          filter: { product_id: productId! }, perPage: 2000,
        }),
      ]);
      const soldSet = new Set(sold.map((s) => s.serial_number).filter(Boolean));
      const all = [
        ...purchased.map((p) => p.serial_number).filter((v): v is string => !!v),
        ...exchanged.map((e) => e.imei).filter((v): v is string => !!v),
      ].filter(Boolean);
      // dedupe and exclude sold
      return Array.from(new Set(all)).filter((sn) => !soldSet.has(sn as any));
    },
  });
}
