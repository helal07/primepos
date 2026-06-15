import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";

export type PermAction = "view" | "create" | "edit" | "delete";

interface PermRow {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface PermResult {
  isAdmin: boolean;
  perms: Record<string, PermRow>;
  keys: Set<string>;
}

export function useMyPermissions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_permissions", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<PermResult> => {
      const res = await api.get<{
        isAdmin: boolean;
        perms: Record<string, PermRow> | unknown[];
        keys: string[];
      }>("/api/me/permissions");
      // Laravel encodes an empty associative array as []. Coerce back.
      const perms = Array.isArray(res.perms) ? {} : (res.perms as Record<string, PermRow>);
      return {
        isAdmin: !!res.isAdmin,
        perms,
        keys: new Set<string>(res.keys ?? []),
      };
    },
  });
}

export function useCan(module: string, action: PermAction = "view") {
  const { data, isLoading } = useMyPermissions();
  const allowed = !!data && (data.isAdmin || !!data.perms[module]?.[`can_${action}` as keyof PermRow]);
  return { allowed, isLoading };
}

/** Check a granular Ultimate POS-style permission key (e.g. "sell.edit_price_on_pos"). */
export function useCanKey(key: string) {
  const { data, isLoading } = useMyPermissions();
  const allowed = !!data && (data.isAdmin || data.keys.has(key));
  return { allowed, isLoading };
}
