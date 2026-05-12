import { useParams } from "react-router-dom";
import { useHostTenant } from "@/contexts/TenantHostContext";

/**
 * Returns the storefront URL prefix and the active tenant slug.
 * - On the platform host (lovable.app), prefix is `/store/<slug>` from the route.
 * - On a tenant's custom domain or wildcard subdomain, prefix is `""` (root).
 */
export function useStoreBase() {
  const { tenantSlug } = useParams();
  const host = useHostTenant();
  if (host) {
    return { base: "", slug: host.slug, isCustomHost: true };
  }
  return { base: tenantSlug ? `/store/${tenantSlug}` : "", slug: tenantSlug ?? "", isCustomHost: false };
}
