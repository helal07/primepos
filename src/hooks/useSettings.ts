import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toFriendlyError } from "@/lib/friendlyError";
import { rest } from "@/lib/restResource";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useSettings() {
  return useQuery({
    queryKey: ["business_settings"],
    queryFn: async () => {
      const data = await rest.all<any>("business_settings", { perPage: 1000 });
      const map: Record<string, any> = {};
      (data ?? []).forEach((s: any) => { map[s.key] = s.value; });
      return map;
    },
  });
}

export function useSaveSetting() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const tenantId: string | null = user?.tenant_id ?? null;

      const filter: Record<string, any> = { key };
      if (tenantId) filter.tenant_id = tenantId;
      else filter.tenant_id = { null: true };
      const existing = await rest.all<{ id: string }>("business_settings", {
        filter,
        perPage: 1,
      });

      if (existing[0]) {
        await rest.update("business_settings", existing[0].id, { value, updated_by: user?.id });
      } else {
        await rest.create("business_settings", { key, value, updated_by: user?.id, tenant_id: tenantId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business_settings"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(toFriendlyError(e)),
  });
}
