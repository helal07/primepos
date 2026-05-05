import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAvailableSerials(productId: string | null) {
  return useQuery({
    queryKey: ["available_serials", productId],
    enabled: !!productId,
    queryFn: async () => {
      // Get all serial numbers from purchase_items for this product
      const { data: purchased, error: pErr } = await supabase
        .from("purchase_items")
        .select("serial_number")
        .eq("product_id", productId!)
        .not("serial_number", "is", null)
        .neq("serial_number", "");
      if (pErr) throw pErr;

      // Get IMEIs from exchange_purchases linked to this product (used phones)
      const { data: exchanged, error: eErr } = await supabase
        .from("exchange_purchases")
        .select("imei")
        .eq("linked_product_id", productId!)
        .eq("status", "in_stock")
        .not("imei", "is", null)
        .neq("imei", "");
      if (eErr) throw eErr;

      // Get all serial numbers already sold
      const { data: sold, error: sErr } = await supabase
        .from("sale_items")
        .select("serial_number")
        .eq("product_id", productId!)
        .not("serial_number", "is", null)
        .neq("serial_number", "");
      if (sErr) throw sErr;

      const soldSet = new Set((sold || []).map((s) => s.serial_number));
      const all = [
        ...(purchased || []).map((p) => p.serial_number!),
        ...(exchanged || []).map((e: any) => e.imei as string),
      ].filter(Boolean);
      // dedupe and exclude sold
      return Array.from(new Set(all)).filter((sn) => !soldSet.has(sn));
    },
  });
}
