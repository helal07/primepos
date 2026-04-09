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

      // Get all serial numbers already sold
      const { data: sold, error: sErr } = await supabase
        .from("sale_items")
        .select("serial_number")
        .eq("product_id", productId!)
        .not("serial_number", "is", null)
        .neq("serial_number", "");
      if (sErr) throw sErr;

      const soldSet = new Set((sold || []).map((s) => s.serial_number));
      return (purchased || [])
        .map((p) => p.serial_number!)
        .filter((sn) => !soldSet.has(sn));
    },
  });
}
