/**
 * Live IMEI / serial-number search for POS.
 * Looks up partial serials in purchase_items and exchange_purchases (in stock),
 * excluding anything already sold, and returns the matching serials with their
 * product id so the POS search bar can suggest them like products.
 */
import { useQuery } from "@tanstack/react-query";
import { rest } from "@/lib/restResource";

export interface SerialMatch {
  serial_number: string;
  product_id: string;
  source: "purchase" | "exchange";
}

export function useSerialSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["serial_search", q.toLowerCase()],
    enabled: q.length >= 3,
    staleTime: 15_000,
    queryFn: async (): Promise<SerialMatch[]> => {
      const like = `%${q}%`;
      const [purchased, exchanged, sold] = await Promise.all([
        rest
          .all<{ serial_number: string | null; product_id: string | null }>("purchase_items", {
            filter: { serial_number: { ilike: like } },
            perPage: 50,
          })
          .catch(() => []),
        rest
          .all<{ imei: string | null; linked_product_id: string | null; status: string | null }>(
            "exchange_purchases",
            { filter: { imei: { ilike: like }, status: "in_stock" }, perPage: 50 },
          )
          .catch(() => []),
        rest
          .all<{ serial_number: string | null }>("sale_items", {
            filter: { serial_number: { ilike: like } },
            perPage: 200,
          })
          .catch(() => []),
      ]);

      const soldSet = new Set(
        sold.map((s) => s.serial_number?.toLowerCase()).filter(Boolean) as string[],
      );

      const out: SerialMatch[] = [];
      const seen = new Set<string>();
      const push = (serial: string | null, productId: string | null, source: SerialMatch["source"]) => {
        if (!serial || !productId) return;
        const key = serial.toLowerCase();
        if (soldSet.has(key) || seen.has(key)) return;
        seen.add(key);
        out.push({ serial_number: serial, product_id: productId, source });
      };

      purchased.forEach((p) => push(p.serial_number, p.product_id, "purchase"));
      exchanged.forEach((e) => push(e.imei, e.linked_product_id, "exchange"));

      return out.slice(0, 20);
    },
  });
}
