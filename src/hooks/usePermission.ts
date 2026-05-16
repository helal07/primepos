import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
}

export function useMyPermissions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_permissions", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<PermResult> => {
      const { data: tmFlag } = await supabase.rpc("is_tenant_manager_or_above", { _user_id: user!.id });
      if (tmFlag) return { isAdmin: true, perms: {} };

      // Get role ids for this user, then their permissions
      const { data: ur } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", user!.id);
      const roleIds = (ur ?? []).map((r) => r.role_id);
      if (roleIds.length === 0) return { isAdmin: false, perms: {} };

      const { data: rps } = await supabase
        .from("role_permissions")
        .select("module,can_view,can_create,can_edit,can_delete")
        .in("role_id", roleIds);

      const merged: Record<string, PermRow> = {};
      for (const row of (rps ?? []) as PermRow[]) {
        const cur = merged[row.module] ?? {
          module: row.module, can_view: false, can_create: false, can_edit: false, can_delete: false,
        };
        merged[row.module] = {
          module: row.module,
          can_view: cur.can_view || row.can_view,
          can_create: cur.can_create || row.can_create,
          can_edit: cur.can_edit || row.can_edit,
          can_delete: cur.can_delete || row.can_delete,
        };
      }
      return { isAdmin: false, perms: merged };
    },
  });
}

export function useCan(module: string, action: PermAction = "view") {
  const { data, isLoading } = useMyPermissions();
  const allowed = !!data && (data.isAdmin || !!data.perms[module]?.[`can_${action}` as keyof PermRow]);
  return { allowed, isLoading };
}
