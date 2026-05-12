import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HostTenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  domain_verified_at: string | null;
}

const Ctx = createContext<HostTenant | null>(null);

function isPlatformHost(host: string) {
  if (!host) return true;
  if (host === "localhost" || host.startsWith("127.") || host.endsWith(".local")) return true;
  if (host.endsWith(".lovable.app") || host.endsWith(".lovable.dev")) return true;
  if (host.endsWith(".lovableproject.com") || host.endsWith(".sandbox.lovable.dev")) return true;
  return false;
}

export function TenantHostProvider({ children }: { children: ReactNode }) {
  const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  const skip = isPlatformHost(host);

  const { data } = useQuery({
    queryKey: ["tenant_by_host", host],
    enabled: !skip,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<HostTenant | null> => {
      const { data, error } = await supabase.rpc("get_tenant_by_host", { _host: host });
      if (error) return null;
      const row = Array.isArray(data) ? data[0] : data;
      return row ?? null;
    },
  });

  return <Ctx.Provider value={data ?? null}>{children}</Ctx.Provider>;
}

export function useHostTenant() {
  return useContext(Ctx);
}

/** True when the current hostname is a tenant's custom/wildcard domain. */
export function useIsTenantHost() {
  return !!useContext(Ctx);
}
