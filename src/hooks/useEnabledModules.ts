import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MODULE_CATALOG, type ModuleKey } from "@/lib/modules";

/**
 * Returns the effective list of enabled modules for the current tenant.
 * - Superadmins always see everything.
 * - Otherwise: tenant override wins; falls back to package's enabled_modules.
 * - If no package/override is set, returns full catalog so the app stays usable.
 */
export function useEnabledModules() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["enabled_modules", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<ModuleKey[]> => {
      const { data: isSuper } = await supabase.rpc("is_superadmin", { _user_id: user!.id });
      if (isSuper) return MODULE_CATALOG.map((m) => m.key);

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!profile?.tenant_id) return MODULE_CATALOG.map((m) => m.key);

      const { data: tenant } = await supabase
        .from("tenants")
        .select("enabled_modules, package_id, saas_packages(enabled_modules)")
        .eq("id", profile.tenant_id)
        .maybeSingle();

      const fromTenant = (tenant as any)?.enabled_modules as string[] | null;
      const fromPackage = (tenant as any)?.saas_packages?.enabled_modules as string[] | null;
      const list = fromTenant && fromTenant.length ? fromTenant : fromPackage;
      if (!list || !list.length) return MODULE_CATALOG.map((m) => m.key);
      return list as ModuleKey[];
    },
  });
}

export function useHasModule(key: ModuleKey) {
  const { data, isLoading } = useEnabledModules();
  return { hasModule: !!data?.includes(key), isLoading };
}