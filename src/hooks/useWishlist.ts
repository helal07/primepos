import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function getToken(): string {
  const k = "wishlist_token";
  let t = localStorage.getItem(k);
  if (!t) { t = crypto.randomUUID(); localStorage.setItem(k, t); }
  return t;
}

export function useWishlist(tenantId?: string) {
  const qc = useQueryClient();
  const token = typeof window !== "undefined" ? getToken() : "";

  const { data: items = [] } = useQuery({
    queryKey: ["wishlist", tenantId, token],
    enabled: !!tenantId && !!token,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("wishlist_items")
        .select("id, product_id, products:product_id(id,name,selling_price,image_url,website_slug)")
        .eq("tenant_id", tenantId)
        .eq("session_token", token);
      return data || [];
    },
  });

  const ids = new Set<string>(items.map((i: any) => i.product_id));

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (!tenantId) return;
      if (ids.has(productId)) {
        const item = items.find((i: any) => i.product_id === productId);
        if (item) await (supabase as any).from("wishlist_items").delete().eq("id", item.id);
      } else {
        await (supabase as any).from("wishlist_items").insert({
          tenant_id: tenantId, session_token: token, product_id: productId,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  return { items, ids, toggle };
}