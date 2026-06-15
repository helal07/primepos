import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useWarrantyClaims() {
  return useQuery({
    queryKey: ["warranty_claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warranty_claims")
        .select("*, customers(name), products(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useWarrantyMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const upsertClaim = useMutation({
    mutationFn: async (claim: any) => {
      if (claim.id) {
        const { error } = await supabase.from("warranty_claims").update(claim).eq("id", claim.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("warranty_claims").insert({ ...claim, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warranty_claims"] }); toast.success("Claim saved"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const deleteClaim = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warranty_claims").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warranty_claims"] }); toast.success("Claim deleted"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { upsertClaim, deleteClaim };
}
