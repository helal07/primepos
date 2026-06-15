import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { MODULE_CATALOG, type ModuleKey } from "@/lib/modules";

/**
 * Returns the effective list of enabled modules for the current tenant.
 * Backed by /api/me/modules — server resolves superadmin / tenant / package.
 */
export function useEnabledModules() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["enabled_modules", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<ModuleKey[]> => {
      const res = await api.get<{ modules: string[] | null; all: boolean }>("/api/me/modules");
      if (res.all || !res.modules?.length) return MODULE_CATALOG.map((m) => m.key);
      return res.modules as ModuleKey[];
    },
  });
}

export function useHasModule(key: ModuleKey) {
  const { data, isLoading } = useEnabledModules();
  return { hasModule: !!data?.includes(key), isLoading };
}
