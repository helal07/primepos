import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { rest } from "@/lib/restResource";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantRealtime } from "@/hooks/useTenantRealtime";
import { toast } from "sonner";

const aliasClaim = (c: any) => {
  if (!c) return c;
  const out = { ...c };
  if (c.customer && !c.customers) out.customers = c.customer;
  if (c.product && !c.products) out.products = c.product;
  return out;
};

export function useWarrantyClaims() {
  useTenantRealtime(["warranty_claims"], [["warranty_claims"]]);
  return useQuery({
    queryKey: ["warranty_claims"],
    queryFn: async () => {
      const rows = await rest.all<any>("warranty_claims", {
        with: ["customer", "product"],
        sort: "-created_at",
        perPage: 500,
      });
      return rows.map(aliasClaim);
    },
  });
}

export function useWarrantyMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const upsertClaim = useMutation({
    mutationFn: async (claim: any) => {
      if (claim.id) {
        const { id, ...rest_ } = claim;
        await rest.update("warranty_claims", id, rest_);
      } else {
        await rest.create("warranty_claims", { ...claim, created_by: user?.id });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warranty_claims"] }); toast.success("Claim saved"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  const deleteClaim = useMutation({
    mutationFn: async (id: string) => {
      await rest.remove("warranty_claims", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["warranty_claims"] }); toast.success("Claim deleted"); },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });

  return { upsertClaim, deleteClaim };
}
